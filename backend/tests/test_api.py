import json
import time
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.models import ContactMessage, Project
from app.seed import seed


@pytest.fixture
def client(monkeypatch):
    # Tests must never use a developer's live AI/email credentials.
    from app.core.config import get_settings
    settings=get_settings()
    for key,value in {'environment':'development','assistant_mode':'grounded','ai_provider':'openai','ai_api_key':'','ai_model':'','email_provider':'','smtp_host':'','contact_rate_limit':5,'assistant_rate_limit':30,'assistant_session_limit':30}.items():monkeypatch.setattr(settings,key,value)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        content = json.loads((Path(__file__).resolve().parents[2] / "content" / "portfolio.json").read_text())
        assert seed(db, content)
        assert not seed(db, content)
    def override():
        with Session(engine) as db:
            yield db
    from app.services import email_service
    monkeypatch.setattr(email_service, "SessionLocal", lambda: Session(engine))
    app.dependency_overrides[get_db] = override
    with TestClient(app) as test_client:
        yield test_client, engine
    app.dependency_overrides.clear()
    engine.dispose()


def payload(**overrides):
    return {"name": "Test Recruiter", "email": "recruiter@example.com", "subject": "Engineering opportunity",
            "message": "I would like to discuss a full-stack engineering opportunity.",
            "website": "", "started_at": int(time.time() * 1000) - 6000, **overrides}


def test_resume_data_round_trip(client):
    api, engine = client
    projects = api.get("/api/projects").json()
    assert len(projects) == 3
    assert projects[0]["slug"] == "kubasie"
    assert "60 minutes" in projects[0]["solution"]
    assert projects[0]["edges"][0]["source"] == "forecast"
    assert api.get("/api/projects/kf-probe").json()["live_url"] is None
    assert api.get("/api/projects/missing").status_code == 404
    skills = api.get("/api/skills").json()
    assert next(s for s in skills if s["name"] == "FastAPI")["usages"] == ["Internship backend migration", "KubASIE policy service"]
    assert len(api.get("/api/experience").json()) == 1
    contributions = api.get("/api/contributions").json()
    assert contributions[0]["status"] == "Merged"
    assert contributions[1]["status"] == "Contribution"
    assert api.get("/api/certifications").json()[0]["kind"] == "Training"


def test_contact_persists_and_rate_limits(client):
    api, engine = client
    for _ in range(5):
        response = api.post("/api/contact", json=payload())
        assert response.status_code == 201, response.text
    assert api.post("/api/contact", json=payload()).status_code == 429
    with Session(engine) as db:
        messages = db.scalars(select(ContactMessage)).all()
        assert len(messages) == 5
        assert messages[0].email == "recruiter@example.com"
        assert len(messages[0].ip_hash) == 64


@pytest.mark.parametrize("changes,code", [({"email":"invalid"},422),({"message":"short"},422),({"name":" "},422),({"website":"spam.example"},400),({"started_at":int(time.time()*1000)+60000},400),({"unexpected":"field"},422)])
def test_contact_rejects_invalid_or_spam(client, changes, code):
    api, engine = client
    assert api.post("/api/contact", json=payload(**changes)).status_code == code
    with Session(engine) as db:
        assert db.scalar(select(ContactMessage.id)) is None


def test_health_headers_and_cors(client):
    api, _ = client
    response = api.get("/api/ready")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    allowed = api.options("/api/contact", headers={"Origin":__import__("app.core.config", fromlist=["get_settings"]).get_settings().origins[0],"Access-Control-Request-Method":"POST"})
    assert allowed.status_code == 200
    forbidden = api.options("/api/contact", headers={"Origin":"https://untrusted.example","Access-Control-Request-Method":"POST"})
    assert forbidden.status_code == 400
    assert api.post("/api/contact", content="x"*33000).status_code == 413

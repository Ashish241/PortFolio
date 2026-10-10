from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import Project, Contribution, Certification, CandidateProfile, Education
from app.schemas import ProjectOut, TechnologyOut, ExperienceOut, ContributionOut, CertificationOut, ContactCreate
from app.services.portfolio import project_query, serialize_project, get_skills, get_experience
from app.services.contact import store_contact, notify_new_contact
from app.schemas import AssistantRequest, AssistantResponse
from app.services.portfolio_agent import chat, clear

router = APIRouter(prefix="/api")
DB = Annotated[Session, Depends(get_db)]


@router.post("/assistant/chat", response_model=AssistantResponse)
def assistant_chat(payload: AssistantRequest, request: Request, db: DB):
    return chat(db, payload.message, payload.conversation_id, request.client.host if request.client else "unknown", payload.section_id, payload.project_id)


@router.post("/assistant/clear")
def assistant_clear(payload: AssistantRequest, request: Request):
    return clear(payload.conversation_id or "", request.client.host if request.client else "unknown")


@router.get("/profile")
def profile(db: DB):
    p = db.get(CandidateProfile, 1)
    if p is None:
        raise HTTPException(503, "Verified profile is not initialized")
    return {k: getattr(p, k) for k in ["name", "location", "email", "github_url", "linkedin_url", "summary"]} | {"roles": [r.title for r in p.roles]}


@router.get("/education")
def education(db: DB):
    return [{k: getattr(e, k) for k in ["qualification", "institution", "expected_year", "grade"]} for e in db.scalars(select(Education).order_by(Education.id))]


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/ready")
def ready(db: DB):
    db.execute(text("SELECT 1"))
    if db.get(CandidateProfile, 1) is None:
        raise HTTPException(503, "Verified profile is not initialized")
    return {"status": "ready"}


@router.get("/projects", response_model=list[ProjectOut])
def projects(db: DB):
    return [serialize_project(p) for p in db.scalars(project_query().order_by(Project.order))]


@router.get("/projects/{slug}", response_model=ProjectOut)
def project(slug: str, db: DB):
    result = db.scalar(project_query().where(Project.slug == slug))
    if result is None:
        raise HTTPException(404, "Project not found")
    return serialize_project(result)


@router.get("/skills", response_model=list[TechnologyOut])
def skills(db: DB):
    return get_skills(db)


@router.get("/experience", response_model=list[ExperienceOut])
def experience(db: DB):
    return get_experience(db)


@router.get("/contributions", response_model=list[ContributionOut])
def contributions(db: DB):
    return db.scalars(select(Contribution).order_by(Contribution.id)).all()


@router.get("/certifications", response_model=list[CertificationOut])
def certifications(db: DB):
    return db.scalars(select(Certification).order_by(Certification.year.desc(), Certification.id)).all()


@router.post("/contact", status_code=201)
def contact(payload: ContactCreate, request: Request, db: DB, tasks: BackgroundTasks):
    # Forwarded headers are accepted only by Uvicorn's explicitly trusted proxy configuration.
    message = store_contact(db, payload, request.client.host if request.client else "unknown")
    tasks.add_task(notify_new_contact, message.id)
    return {"message": "Your message was received and stored."}

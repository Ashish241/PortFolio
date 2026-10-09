import json
from io import BytesIO
import pytest
from urllib.error import HTTPError
from app.core.config import Settings, get_settings
from app.services import ai_service
from test_api import client


def test_env_key_alone_selects_groq_and_requested_model(tmp_path, monkeypatch):
    for name in ("AI_PROVIDER", "AI_MODEL", "AI_API_KEY", "GROQ_API_KEY", "ASSISTANT_MODE"):
        monkeypatch.delenv(name, raising=False)
    env = tmp_path / ".env"
    env.write_text("AI_API_KEY=test-key-only\n", encoding="utf-8")
    settings = Settings(_env_file=env)
    assert settings.ai_provider == "groq"
    assert settings.ai_model == "llama-3.1-8b-instant"
    assert settings.assistant_mode == "auto"
    monkeypatch.setattr(ai_service, "get_settings", lambda: settings)
    assert isinstance(ai_service.configured_provider(), ai_service.GroqService)


def configure(monkeypatch):
    settings = get_settings()
    for name, value in {"ai_provider": "groq", "ai_model": "llama-3.1-8b-instant", "ai_api_key": "test-groq-secret", "assistant_mode": "auto"}.items():
        monkeypatch.setattr(settings, name, value)


class Reply:
    def __init__(self, content, finish="stop"):
        self.data = json.dumps({"choices": [{"finish_reason": finish, "message": {"content": content}}]}).encode()
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self, size): return self.data


def test_groq_chat_contract_and_verified_followup(client, monkeypatch):
    api, _ = client
    configure(monkeypatch)
    calls = []
    def respond(request, timeout):
        assert request.full_url == "https://api.groq.com/openai/v1/chat/completions"
        assert request.get_header("Authorization") == "Bearer test-groq-secret"
        body = json.loads(request.data)
        assert body["model"] == "llama-3.1-8b-instant"
        assert body["response_format"] == {"type": "json_object"}
        assert "text" not in body and "instructions" not in body
        assert "test-groq-secret" not in request.data.decode()
        assert timeout == get_settings().assistant_timeout_seconds
        context = json.loads(body["messages"][1]["content"])
        calls.append(context)
        return Reply(json.dumps({"fact_ids": ["project:kubasie"]}))
    monkeypatch.setattr(ai_service, "urlopen", respond)
    first = api.post("/api/assistant/chat", json={"message": "Tell me about KubASIE"})
    assert first.status_code == 200
    data = first.json()
    assert data["mode"] == "groq" and "PyTorch" in data["answer"]
    assert data["sources"][0]["id"] == "project:kubasie"
    assert data["suggested_actions"][0]["target"] == "kubasie"
    follow = api.post("/api/assistant/chat", json={"message": "What technologies did he use?", "conversation_id": data["conversation_id"]})
    assert follow.status_code == 200
    assert calls[1]["recent_questions"] == ["Tell me about KubASIE"]


def test_unavailable_llama_model_retries_supported_groq_model(client, monkeypatch):
    api, _ = client
    configure(monkeypatch)
    models = []
    def respond(request, timeout):
        body = json.loads(request.data)
        models.append(body["model"])
        if len(models) == 1:
            error = b'{"error":{"code":"model_not_found"}}'
            raise HTTPError(request.full_url, 404, "model unavailable", {}, BytesIO(error))
        assert body["reasoning_format"] == "hidden"
        return Reply('{"fact_ids":["project:kubasie"]}')
    monkeypatch.setattr(ai_service, "urlopen", respond)
    response = api.post("/api/assistant/chat", json={"message": "Tell me about KubASIE"})
    assert response.status_code == 200
    assert response.json()["mode"] == "groq"
    assert models == ["llama-3.1-8b-instant", "openai/gpt-oss-20b"]


@pytest.mark.parametrize("content,finish", [
    ('{"fact_ids":["invented:job"]}', "stop"),
    ('{"fact_ids":[42]}', "stop"),
    ('{"fact_ids":[],"answer":"invented"}', "stop"),
    ('{"fact_ids":"project:kubasie"}', "stop"),
    ('not-json', "stop"),
    ('{"fact_ids":["project:kubasie"]}', "length"),
])
def test_groq_invalid_or_truncated_output_is_rejected(client, monkeypatch, content, finish):
    api, _ = client
    configure(monkeypatch)
    monkeypatch.setattr(ai_service, "urlopen", lambda *a, **k: Reply(content, finish))
    response = api.post("/api/assistant/chat", json={"message": "Tell me about KubASIE"})
    assert response.status_code == 502 and "answer" not in response.json()


def test_groq_missing_key_and_auth_failure_do_not_expose_secrets(client, monkeypatch):
    api, _ = client
    configure(monkeypatch)
    monkeypatch.setattr(get_settings(), "ai_api_key", "")
    missing = api.post("/api/assistant/chat", json={"message": "Tell me about Ashish"})
    assert missing.status_code == 503 and "AI_API_KEY" in missing.json()["detail"]
    configure(monkeypatch)
    def rejected(*a, **k): raise HTTPError("https://api.groq.com", 401, "test-groq-secret", {}, None)
    monkeypatch.setattr(ai_service, "urlopen", rejected)
    failed = api.post("/api/assistant/chat", json={"message": "Tell me about Ashish"})
    assert failed.status_code == 502 and "test-groq-secret" not in failed.text

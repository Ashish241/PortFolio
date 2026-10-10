from app.core.config import Settings


def test_managed_postgres_url_uses_installed_psycopg_driver(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    env = tmp_path / ".env"
    env.write_text("DATABASE_URL=postgresql://user:pass@db.example/portfolio?sslmode=require\n")
    settings = Settings(_env_file=env)
    assert settings.database_url == "postgresql+psycopg://user:pass@db.example/portfolio?sslmode=require"


def test_short_managed_postgres_scheme(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    env = tmp_path / ".env"
    env.write_text("DATABASE_URL=postgres://user:pass@db.example/portfolio\n")
    settings = Settings(_env_file=env)
    assert settings.database_url.startswith("postgresql+psycopg://")

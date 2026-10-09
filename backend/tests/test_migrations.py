from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def test_contact_migration_preserves_existing_inquiry(tmp_path, monkeypatch):
    backend=Path(__file__).resolve().parents[1]
    url='sqlite:///'+(tmp_path/'migration-test.sqlite3').as_posix()
    monkeypatch.setattr(get_settings(),'database_url',url)
    config=Config(str(backend/'alembic.ini'))
    config.set_main_option('script_location',str(backend/'migrations'))
    command.upgrade(config,'0002')
    engine=create_engine(url)
    with engine.begin() as db:
        db.execute(text("INSERT INTO contact_messages (name,email,subject,message,ip_hash,created_at) VALUES ('Migration Recruiter','recruiter@example.com','Existing inquiry','This existing inquiry must survive the upgrade.','test-hash','2026-10-07 12:00:00')"))
    command.upgrade(config,'head')
    with engine.connect() as db:
        row=db.execute(text('SELECT subject,status,email_delivery_status FROM contact_messages')).one()
        assert tuple(row)==('Existing inquiry','NEW','PENDING')
    command.check(config)
    engine.dispose()

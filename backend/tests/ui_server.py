"""Local-only integration harness; never imported by the production application."""
import json
import socket
import sys
import threading
import time
from pathlib import Path
from sqlalchemy import create_engine, select, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import SQLAlchemyError
import uvicorn
from app.main import app
from app.database.session import Base, get_db
from app.models import ContactMessage
from app.seed import seed
from app.services import email_service
from app.core.config import get_settings

settings=get_settings()
settings.assistant_mode='grounded' # Explicit retrieval integration fixture; not a live AI claim.
settings.ai_api_key=''
settings.ai_model=''
settings.environment='development'
settings.email_provider=''
settings.smtp_host=''
engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
Base.metadata.create_all(engine)
with Session(engine) as db:seed(db,json.loads((Path(__file__).resolve().parents[2]/'content/portfolio.json').read_text(encoding='utf-8')))
def db_override():
    with Session(engine) as db:yield db
app.dependency_overrides[get_db]=db_override
email_service.SessionLocal=lambda:Session(engine)
faults={'storage':False,'email':False}
original_deliver=email_service.deliver

def notification(message):
    if faults['email']:raise TimeoutError('test delivery failure')
    return original_deliver(message)
email_service.deliver=notification
@event.listens_for(engine,'before_cursor_execute')
def storage_fault(connection,cursor,statement,parameters,context,executemany):
    if faults['storage'] and statement.startswith('INSERT INTO contact_messages'):raise SQLAlchemyError('test storage failure')
@app.get('/__test__/contacts')
def inspect_contacts():
    with Session(engine) as db:return [{'subject':m.subject,'status':m.status,'delivery':m.email_delivery_status} for m in db.scalars(select(ContactMessage))]
@app.post('/__test__/faults')
def inject_faults(payload:dict):
    faults.update(payload)
    return {'configured':True}
# Bind a fresh ephemeral loopback port, avoiding existing development servers.
sock=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
sock.bind(('127.0.0.1',0))
port=sock.getsockname()[1]
server=uvicorn.Server(uvicorn.Config(app,log_level='error'))
thread=threading.Thread(target=lambda:server.run(sockets=[sock]),daemon=True)
thread.start()
for _ in range(200):
    if server.started:break
    if not thread.is_alive():raise RuntimeError('Test API server did not start')
    time.sleep(.025)
print(json.dumps({'port':port}),flush=True)
sys.stdin.readline()
server.should_exit=True
thread.join(timeout=5)
sock.close()

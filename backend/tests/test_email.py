import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models import ContactMessage
from app.services import email_service
from test_api import client, payload

def test_email_development_fallback_preserves_new_message(client, caplog):
    api, engine=client
    with caplog.at_level('INFO'):
        assert api.post('/api/contact',json=payload()).status_code==201
    assert 'Email notification disabled in development.' in caplog.text
    with Session(engine) as db:
        m=db.scalar(select(ContactMessage))
        assert m.status=='NEW' and m.email_delivery_status=='DISABLED'

def test_plaintext_smtp_notification_and_failure_do_not_lose_message(client, monkeypatch, caplog):
    api,engine=client
    s=get_settings()
    for key,value in {'email_provider':'smtp','smtp_host':'smtp.example.test','contact_receiver_email':'owner@example.com','email_from_address':'portfolio@example.com','smtp_username':'test-user','smtp_password':'test-password'}.items():monkeypatch.setattr(s,key,value)
    sent=[]
    class SMTP:
        def __init__(self,*args,**kwargs):assert kwargs['timeout']==10
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def starttls(self,**kwargs):assert kwargs['context']
        def login(self,user,password):assert user=='test-user' and password=='test-password'
        def send_message(self,mail):sent.append(mail);return {}
    monkeypatch.setattr(email_service.smtplib,'SMTP',SMTP)
    assert api.post('/api/contact',json=payload(message='<script>alert(1)</script> This is user supplied plaintext.')).status_code==201
    assert sent[0].get_content_type()=='text/plain'
    assert 'Sender name: Test Recruiter' in sent[0].get_content()
    assert 'Sender email: recruiter@example.com' in sent[0].get_content()
    assert 'Submitted:' in sent[0].get_content()
    assert sent[0]['Reply-To']=='recruiter@example.com'
    with Session(engine) as db:assert db.scalar(select(ContactMessage)).email_delivery_status=='SENT'
    def fail(*args,**kwargs):raise TimeoutError('test-only failure')
    monkeypatch.setattr(email_service.smtplib,'SMTP',fail)
    with caplog.at_level('WARNING'):assert api.post('/api/contact',json=payload(subject='Preserve this inquiry')).status_code==201
    with Session(engine) as db:
        records=db.scalars(select(ContactMessage).order_by(ContactMessage.id)).all()
        assert len(records)==2 and records[-1].status=='NEW' and records[-1].email_delivery_status=='FAILED'
    assert 'Stored message retained' in caplog.text
    assert 'test-password' not in caplog.text

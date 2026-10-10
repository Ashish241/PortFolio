import pytest
import json
from io import BytesIO
from urllib.error import HTTPError
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models import ContactMessage
from app.services import email_service
from app import retry_email
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


def test_private_retry_only_processes_confirmed_failure(client, monkeypatch):
    api, engine = client
    assert api.post('/api/contact', json=payload()).status_code == 201
    with Session(engine) as db:
        message = db.scalar(select(ContactMessage))
        message.email_delivery_status = 'FAILED'
        message_id = message.id
        db.commit()
    monkeypatch.setattr(retry_email, 'SessionLocal', lambda: Session(engine))
    calls = []
    def deliver_once(identifier):
        calls.append(identifier)
        with Session(engine) as db:
            db.get(ContactMessage, identifier).email_delivery_status = 'SENT'
            db.commit()
    monkeypatch.setattr(retry_email, 'notify_new_contact', deliver_once)
    assert retry_email.retry_failed(message_id) == 'SENT'
    assert retry_email.retry_failed(message_id) == 'not_failed'
    assert retry_email.retry_failed(message_id + 1) == 'not_found'
    assert calls == [message_id]


def test_resend_https_notification_uses_verified_plaintext_and_idempotency(client, monkeypatch):
    api, engine = client
    settings = get_settings()
    for key, value in {
        'email_provider': 'resend',
        'email_api_key': 'test-resend-key',
        'contact_receiver_email': 'owner@example.com',
        'email_from_address': 'Portfolio <portfolio@example.com>',
    }.items():
        monkeypatch.setattr(settings, key, value)
    requests = []
    class Reply:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def read(self, size): return b'{"id":"test-message-id"}'
    def respond(request, timeout):
        requests.append(request)
        assert timeout == 10
        assert request.full_url == 'https://api.resend.com/emails'
        assert request.get_header('Authorization') == 'Bearer test-resend-key'
        assert request.get_header('Idempotency-key') == 'portfolio-contact-1'
        body = json.loads(request.data)
        assert body['to'] == ['owner@example.com']
        assert body['reply_to'] == 'recruiter@example.com'
        assert '<script>' in body['text']
        assert 'html' not in body
        return Reply()
    monkeypatch.setattr(email_service, 'urlopen', respond)
    response = api.post('/api/contact', json=payload(message='<script>alert(1)</script> This is user supplied plaintext.'))
    assert response.status_code == 201
    assert len(requests) == 1
    with Session(engine) as db:
        assert db.scalar(select(ContactMessage)).email_delivery_status == 'SENT'


@pytest.mark.parametrize('response,expected_type,expected', [
    ({'name': 'validation_error', 'message': 'The sending domain is not verified for sender@example.com'}, 'validation_error', 'Sending domain is not verified.'),
    ({'name': 'validation_error', 'message': 'Unsafe recruiter@example.com secret-contact-body'}, 'validation_error', 'See Resend dashboard for request details.'),
    ({'name': 'bad\nheader', 'message': 'Unsafe secret-contact-body'}, 'unknown', 'See Resend dashboard for request details.'),
])
def test_resend_http_error_logs_safe_diagnostics_and_preserves_contact(client, monkeypatch, caplog, response, expected_type, expected):
    api, engine = client
    settings = get_settings()
    for key, value in {
        'email_provider': 'resend',
        'email_api_key': 'test-secret-api-key',
        'contact_receiver_email': 'owner@example.com',
        'email_from_address': 'portfolio@example.com',
    }.items():
        monkeypatch.setattr(settings, key, value)

    def reject(request, timeout):
        raise HTTPError(request.full_url, 422, 'sensitive reason', {}, BytesIO(json.dumps(response).encode()))
    monkeypatch.setattr(email_service, 'urlopen', reject)
    with caplog.at_level('WARNING'):
        result = api.post('/api/contact', json=payload(message='secret-contact-body'))
    assert result.status_code == 201
    with Session(engine) as db:
        record = db.scalar(select(ContactMessage))
        assert record.status == 'NEW'
        assert record.email_delivery_status == 'FAILED'
        assert record.message == 'secret-contact-body'
    assert 'Resend HTTP 422' in caplog.text
    assert f'type={expected_type}' in caplog.text
    assert f'message={expected}' in caplog.text
    for private in ('test-secret-api-key', 'owner@example.com', 'portfolio@example.com',
                    'sender@example.com', 'recruiter@example.com', 'secret-contact-body', 'sensitive reason'):
        assert private not in caplog.text

"""Optional plaintext email notifications. Storage commits before delivery."""
import logging
import json
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import parseaddr
from datetime import timezone
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from app.core.config import get_settings
from app.database.session import SessionLocal
from app.models import ContactMessage
logger = logging.getLogger(__name__)

class ResendDeliveryError(Exception):
    """Only pre-approved provider diagnostics may reach application logs."""

    def __init__(self, status: int, error_type: str, safe_message: str):
        self.status = status
        self.error_type = error_type
        self.safe_message = safe_message
        super().__init__('Resend request failed')


def _resend_error(error: HTTPError) -> ResendDeliveryError:
    try:
        payload = json.loads(error.read(4096))
    except (ValueError, UnicodeError, OSError):
        payload = None
    if not isinstance(payload, dict):
        payload = {}
    # Provider text is untrusted and may echo request fields. Never log it verbatim.
    raw_type = payload.get('name', payload.get('type', 'unknown'))
    known_types = {'validation_error', 'missing_api_key', 'invalid_api_key',
                   'application_error', 'rate_limit_exceeded', 'not_found',
                   'internal_server_error', 'forbidden', 'invalid_idempotent_request',
                   'invalid_from_address', 'domain_not_verified', 'restricted_api_key'}
    safe_type = raw_type if isinstance(raw_type, str) and raw_type in known_types else 'unknown'
    raw_message = payload.get('message', '')
    message = raw_message.lower() if isinstance(raw_message, str) else ''
    if 'testing email' in message or 'test email' in message:
        safe_message = 'Resend test sender is restricted to permitted recipients.'
    elif 'domain' in message and ('verif' in message or 'not found' in message):
        safe_message = 'Sending domain is not verified.'
    elif 'from' in message and ('invalid' in message or 'verif' in message):
        safe_message = 'Sender address is invalid or unverified.'
    elif 'api key' in message or 'unauthorized' in message:
        safe_message = 'API credentials were rejected.'
    elif 'rate limit' in message:
        safe_message = 'Provider rate limit reached.'
    elif 'permission' in message or 'forbidden' in message or 'access' in message:
        safe_message = 'API key or sender lacks permission for this request.'
    else:
        safe_message = 'See Resend dashboard for request details.'
    return ResendDeliveryError(error.code, safe_type, safe_message)


def _resend_request(message: ContactMessage, settings, *, reply_to: bool = True,
                    idempotency_key: bool = True) -> Request:
    """Build one request; optional fields can be isolated in controlled tests."""
    timestamp = message.created_at.replace(tzinfo=timezone.utc) if message.created_at.tzinfo is None else message.created_at
    body = {
        'from': settings.email_from_address,
        'to': [settings.contact_receiver_email],
        'subject': f'New portfolio inquiry #{message.id}',
        'text': f'Sender name: {message.name}\nSender email: {message.email}\nSubject: {message.subject}\nSubmitted: {timestamp.isoformat()}\n\nMessage:\n{message.message}\n',
    }
    if reply_to:
        body['reply_to'] = message.email
    headers = {'Authorization': f'Bearer {settings.email_api_key}', 'Content-Type': 'application/json',
               'User-Agent': 'Mozilla/5.0'}
    if idempotency_key:
        headers['Idempotency-Key'] = f'portfolio-contact-{message.id}'
    return Request('https://api.resend.com/emails', data=json.dumps(body).encode('utf-8'),
                   headers=headers, method='POST')


def _resend_config_flags(settings) -> str:
    """Only fixed labels and booleans; no credential, address or message text."""
    sender = settings.email_from_address
    parsed_sender = parseaddr(sender)[1]
    return ('key_set=%s key_outer_whitespace=%s sender_set=%s sender_named=%s '
            'sender_test_domain=%s sender_outer_whitespace=%s recipient_set=%s '
            'recipient_outer_whitespace=%s' % (
                bool(settings.email_api_key), settings.email_api_key != settings.email_api_key.strip(),
                bool(sender), '<' in sender and '>' in sender,
                parsed_sender.lower().endswith('@resend.dev'), sender != sender.strip(),
                bool(settings.contact_receiver_email),
                settings.contact_receiver_email != settings.contact_receiver_email.strip()))

def deliver(message: ContactMessage) -> str:
    s = get_settings()
    if s.email_provider == 'resend':
        if not s.email_api_key or not s.contact_receiver_email or not s.email_from_address:
            logger.info('Email notification is not configured.')
            return 'DISABLED'
        request = _resend_request(message, s)
        try:
            with urlopen(request, timeout=10) as response:
                result = json.loads(response.read(10000))
        except HTTPError as error:
            raise _resend_error(error) from None
        if not isinstance(result, dict) or not result.get('id'):
            raise ValueError('Email provider returned no message ID')
        return 'SENT'
    if s.email_provider != 'smtp' or not s.smtp_host or not s.contact_receiver_email or not s.email_from_address or (s.smtp_username and not (s.smtp_password or s.email_api_key)):
        logger.info('Email notification disabled in development.' if s.environment == 'development' else 'Email notification is not configured.')
        return 'DISABLED'
    mail = EmailMessage()
    mail['From'] = s.email_from_address
    mail['To'] = s.contact_receiver_email
    mail['Reply-To'] = message.email
    mail['Subject'] = f'New portfolio inquiry #{message.id}'
    timestamp = message.created_at.replace(tzinfo=timezone.utc) if message.created_at.tzinfo is None else message.created_at
    # User fields are body text, never HTML or headers. EmailMessage handles encoding.
    mail.set_content(f'Sender name: {message.name}\nSender email: {message.email}\nSubject: {message.subject}\nSubmitted: {timestamp.isoformat()}\n\nMessage:\n{message.message}\n')
    transport = smtplib.SMTP_SSL if s.smtp_ssl else smtplib.SMTP
    kwargs = {'timeout': 10}
    if s.smtp_ssl: kwargs['context'] = ssl.create_default_context()
    with transport(s.smtp_host, s.smtp_port, **kwargs) as smtp:
        if s.smtp_starttls and not s.smtp_ssl: smtp.starttls(context=ssl.create_default_context())
        if s.smtp_username: smtp.login(s.smtp_username, s.smtp_password or s.email_api_key)
        refused = smtp.send_message(mail)
        if refused: raise RuntimeError('Recipient refused')
    return 'SENT'

def notify_new_contact(message_id: int):
    with SessionLocal() as db:
        message = db.get(ContactMessage, message_id)
        if message is None: return
        try:
            message.email_delivery_status = deliver(message)
        except Exception as exc:
            message.email_delivery_status = 'FAILED'
            if isinstance(exc, ResendDeliveryError):
                logger.warning('Contact notification failed for message %s (Resend HTTP %s, type=%s, reason=%s; %s). Stored message retained.', message_id, exc.status, exc.error_type, exc.safe_message, _resend_config_flags(get_settings()))
            else:
                logger.warning('Contact notification failed for message %s (%s). Stored message retained.', message_id, type(exc).__name__)
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning('Notification state update failed for message %s (%s). Original inquiry remains stored.', message_id, type(exc).__name__)

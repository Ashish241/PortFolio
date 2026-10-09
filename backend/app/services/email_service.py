"""Optional plaintext SMTP notifications. Storage commits before delivery."""
import logging
import smtplib
import ssl
from email.message import EmailMessage
from datetime import timezone
from app.core.config import get_settings
from app.database.session import SessionLocal
from app.models import ContactMessage
logger = logging.getLogger(__name__)

def deliver(message: ContactMessage) -> str:
    s = get_settings()
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
            # No private contents, credentials or provider response are logged.
            logger.warning('Contact notification failed for message %s (%s). Stored message retained.', message_id, type(exc).__name__)
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning('Notification state update failed for message %s (%s). Original inquiry remains stored.', message_id, type(exc).__name__)

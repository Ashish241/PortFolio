"""Privately retry one confirmed failed contact notification.

Run from an authenticated backend shell: python -m app.retry_email MESSAGE_ID
Check the email provider first; a timeout after acceptance could duplicate mail.
"""
import argparse
from app.database.session import SessionLocal
from app.models import ContactMessage
from app.services.email_service import notify_new_contact


def retry_failed(message_id: int) -> str:
    with SessionLocal() as db:
        message = db.get(ContactMessage, message_id)
        if message is None:
            return "not_found"
        if message.email_delivery_status != "FAILED":
            return "not_failed"
    notify_new_contact(message_id)
    with SessionLocal() as db:
        return db.get(ContactMessage, message_id).email_delivery_status


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Retry one FAILED portfolio email notification")
    parser.add_argument("message_id", type=int)
    status = retry_failed(parser.parse_args().message_id)
    print(f"Notification status: {status}")

import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.core.config import get_settings
from app.models import ContactMessage, RateLimitBucket
from app.schemas import ContactCreate


def reserve_rate_limit(db: Session, key: str, limit: int | None = None, window: int | None = None):
    settings = get_settings()
    now = datetime.now(timezone.utc)
    limit = settings.contact_rate_limit if limit is None else limit
    window = settings.contact_window_seconds if window is None else window
    expiry = now + timedelta(seconds=window)
    # Lock the shared database bucket so concurrent workers cannot bypass the limit.
    if db.bind.dialect.name == "postgresql":
        db.execute(pg_insert(RateLimitBucket).values(key=key, tokens=0, expires_at=expiry).on_conflict_do_nothing(index_elements=["key"]))
        bucket = db.get(RateLimitBucket, key, with_for_update=True)
    else:
        bucket = db.get(RateLimitBucket, key)
        if bucket is None:
            bucket = RateLimitBucket(key=key, tokens=0, expires_at=expiry)
            db.add(bucket)
    bucket_expiry = bucket.expires_at.replace(tzinfo=timezone.utc) if bucket.expires_at.tzinfo is None else bucket.expires_at
    if bucket_expiry <= now:
        bucket.tokens = 0
        bucket.expires_at = expiry
    if bucket.tokens >= limit:
        db.rollback()
        raise HTTPException(429, "The request limit has been reached. Please try again later.", headers={"Retry-After": str(window)})
    bucket.tokens += 1
    db.execute(delete(RateLimitBucket).where(RateLimitBucket.expires_at < now - timedelta(days=1)).execution_options(synchronize_session=False))


def store_contact(db: Session, payload: ContactCreate, ip: str):
    elapsed = time.time() * 1000 - payload.started_at
    if payload.website or elapsed < 2000 or elapsed > 86400000:
        raise HTTPException(400, "Please reload the page and submit the form normally.")
    ip_hash = hmac.new(get_settings().ip_hash_secret.encode(), ip.encode(), hashlib.sha256).hexdigest()
    reserve_rate_limit(db, ip_hash)
    message = ContactMessage(**payload.model_dump(exclude={"website", "started_at"}), ip_hash=ip_hash)
    db.add(message)
    db.commit()
    return message


from app.services.email_service import notify_new_contact

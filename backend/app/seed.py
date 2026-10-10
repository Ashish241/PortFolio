import json
from app.core.config import get_settings
from app.database.session import SessionLocal
from app.services.content_sync import sync_content as seed

if __name__ == '__main__':
    data = json.loads(get_settings().seed_file.read_text(encoding='utf-8'))
    with SessionLocal() as db:
        print('Synchronized latest verified resume content.' if seed(db, data) else 'Verified revision is already current.')

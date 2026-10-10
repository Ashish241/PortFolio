import json
import logging
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record):
        event = {"timestamp": datetime.now(timezone.utc).isoformat(), "level": record.levelname,
                 "logger": record.name, "message": record.getMessage()}
        event.update(getattr(record, "event", {}))
        if record.exc_info:
            event["exception"] = self.formatException(record.exc_info)
        return json.dumps(event)


def configure_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logging.getLogger().handlers = [handler]
    logging.getLogger().setLevel(logging.INFO)

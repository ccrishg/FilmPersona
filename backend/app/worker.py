from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "filmpersona",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks"],
)
celery_app.conf.update(
    task_track_started=True,
    task_time_limit=60 * 15,  # a full scrape+enrich of a big history stays under 15 min
    broker_connection_retry_on_startup=True,
)

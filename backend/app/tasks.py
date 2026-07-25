from app.pipeline import run_pipeline
from app.worker import celery_app


@celery_app.task(name="app.tasks.run_analysis")
def run_analysis(analysis_id: str) -> None:
    run_pipeline(analysis_id)

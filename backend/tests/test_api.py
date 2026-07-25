import io
import zipfile
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from app.models import Analysis, AnalysisSource, AnalysisStatus, ErrorCode, Profile, WatchedEntry

DIARY = """Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
2026-07-01,Parasite,2019,https://boxd.it/hTha,5,,,2026-06-30
"""


def _export_zip() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("diary.csv", DIARY)
    return buffer.getvalue()


class TestCreateAnalysis:
    @patch("app.api.analyses._enqueue")
    def test_valid_username_is_accepted_and_enqueued(self, enqueue, client, db_session):
        response = client.post("/api/analyses", json={"username": "Dave"})

        assert response.status_code == 202
        body = response.json()
        assert body["status"] == "pending"
        enqueue.assert_called_once_with(body["id"])
        analysis = db_session.get(Analysis, body["id"])
        assert analysis.username == "dave"  # normalized to lowercase
        assert analysis.source == AnalysisSource.SCRAPE

    @patch("app.api.analyses._enqueue")
    def test_invalid_username_is_rejected(self, enqueue, client):
        response = client.post("/api/analyses", json={"username": "not a user!!"})

        assert response.status_code == 422
        enqueue.assert_not_called()

    @patch("app.api.analyses._enqueue")
    def test_fresh_analysis_is_reused_as_cache(self, enqueue, client, db_session):
        done = Analysis(source=AnalysisSource.SCRAPE, username="dave", status=AnalysisStatus.DONE)
        db_session.add(done)
        db_session.commit()

        response = client.post("/api/analyses", json={"username": "dave"})

        assert response.json()["id"] == done.id
        enqueue.assert_not_called()

    @patch("app.api.analyses._enqueue")
    def test_stale_analysis_triggers_a_new_run(self, enqueue, client, db_session):
        stale = Analysis(
            source=AnalysisSource.SCRAPE,
            username="dave",
            status=AnalysisStatus.DONE,
            created_at=datetime.now(UTC) - timedelta(days=2),
        )
        db_session.add(stale)
        db_session.commit()

        response = client.post("/api/analyses", json={"username": "dave"})

        assert response.json()["id"] != stale.id
        enqueue.assert_called_once()


class TestImportZip:
    @patch("app.api.analyses._enqueue")
    def test_zip_upload_persists_entries_and_enqueues(self, enqueue, client, db_session):
        response = client.post(
            "/api/analyses/import",
            files={"file": ("export.zip", _export_zip(), "application/zip")},
        )

        assert response.status_code == 202
        analysis_id = response.json()["id"]
        rows = db_session.query(WatchedEntry).filter_by(analysis_id=analysis_id).all()
        assert len(rows) == 1
        assert rows[0].title == "Parasite"
        enqueue.assert_called_once_with(analysis_id)

    @patch("app.api.analyses._enqueue")
    def test_invalid_zip_is_rejected(self, enqueue, client):
        response = client.post(
            "/api/analyses/import",
            files={"file": ("export.zip", b"not a zip", "application/zip")},
        )

        assert response.status_code == 422
        enqueue.assert_not_called()


class TestGetAnalysis:
    def test_missing_analysis_is_404(self, client):
        assert client.get("/api/analyses/nope").status_code == 404

    def test_running_analysis_reports_stage(self, client, db_session):
        analysis = Analysis(
            source=AnalysisSource.SCRAPE,
            username="dave",
            status=AnalysisStatus.RUNNING,
            stage="enrich",
        )
        db_session.add(analysis)
        db_session.commit()

        body = client.get(f"/api/analyses/{analysis.id}").json()

        assert body["status"] == "running"
        assert body["stage"] == "enrich"
        assert "result" not in body

    def test_failed_analysis_exposes_error_code(self, client, db_session):
        analysis = Analysis(
            source=AnalysisSource.SCRAPE,
            username="ghost",
            status=AnalysisStatus.FAILED,
            error_code=ErrorCode.PROFILE_PRIVATE,
        )
        db_session.add(analysis)
        db_session.commit()

        body = client.get(f"/api/analyses/{analysis.id}").json()

        assert body["error_code"] == "PROFILE_PRIVATE"

    def test_done_analysis_includes_result(self, client, db_session):
        analysis = Analysis(
            source=AnalysisSource.SCRAPE, username="dave", status=AnalysisStatus.DONE
        )
        db_session.add(analysis)
        db_session.flush()
        db_session.add(
            Profile(analysis_id=analysis.id, model_version="v1", result={"personality": {}})
        )
        db_session.commit()

        body = client.get(f"/api/analyses/{analysis.id}").json()

        assert body["status"] == "done"
        assert body["result"] == {"personality": {}}

def test_health_reports_db_and_redis_checks(client):
    response = client.get("/health")

    body = response.json()
    assert set(body["checks"]) == {"database", "redis"}
    assert body["checks"]["database"] is True
    # Redis is not running in unit tests: endpoint must degrade, not crash.
    if not body["checks"]["redis"]:
        assert response.status_code == 503
        assert body["status"] == "degraded"

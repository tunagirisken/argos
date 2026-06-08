"""Config ve işlem motoru API testleri."""


def test_config_get(client, auth_headers):
    r = client.get("/api/config", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "llm_provider" in data
    assert "notifications" in data
    assert "scheduler" in data
    assert "integrations" in data


def test_config_llm_provider(client, auth_headers):
    r = client.put("/api/config/llm", headers=auth_headers, json={"provider": "gemini"})
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_config_scheduler(client, auth_headers):
    r = client.put(
        "/api/config/scheduler",
        headers=auth_headers,
        json={"morning": "09:00", "morning_on": True},
    )
    assert r.status_code == 200
    assert r.json()["scheduler"]["morning"] == "09:00"


def test_config_integration_test(client, auth_headers):
    r = client.post("/api/config/integrations/test/telegram", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "ok" in data
    assert "message" in data


def test_engine_status(client, auth_headers):
    r = client.get("/api/engine/status", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "running" in data
    assert "metrics" in data


def test_engine_strategies(client, auth_headers):
    r = client.get("/api/engine/strategies", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json()["strategies"], list)


def test_engine_toggle(client, auth_headers):
    before = client.get("/api/engine/status", headers=auth_headers).json()["running"]
    r = client.post("/api/engine/toggle", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["running"] is not before
    client.post("/api/engine/toggle", headers=auth_headers)


def test_engine_portfolio_advice(client, auth_headers):
    r = client.get("/api/engine/portfolio-advice", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "positions" in data
    assert "generated_at" in data

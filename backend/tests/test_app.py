"""App-level behavior: which browser origins may call the API (CORS), and serving the built frontend
from STATIC_DIR, which is how the Docker image hosts the page and the API at one address."""
import pytest

from backend.app import create_app

FRONTEND = "http://localhost:5173"


# ---- CORS ----

def test_frontend_origin_is_allowed(client):
    r = client.get("/get_all_hw_names", headers={"Origin": FRONTEND})
    assert r.headers.get("Access-Control-Allow-Origin") == FRONTEND

@pytest.mark.parametrize("origin", ["http://evil.example", "http://localhost:3000", "http://127.0.0.1:5173"])
def test_other_origins_are_not_allowed(client, origin):
    r = client.get("/get_all_hw_names", headers={"Origin": origin})
    assert "Access-Control-Allow-Origin" not in r.headers

def test_preflight_allows_json_posts_from_the_frontend(client):
    r = client.options("/add_user", headers={
        "Origin": FRONTEND,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert r.headers.get("Access-Control-Allow-Origin") == FRONTEND
    assert "POST" in r.headers.get("Access-Control-Allow-Methods", "")
    assert "content-type" in r.headers.get("Access-Control-Allow-Headers", "").lower()

# A split deploy: the page is on Netlify, this API is on another host. CORS_ORIGINS names the page.
NETLIFY = "https://haas-demo.netlify.app"

def _client_for_origins(monkeypatch, origins: str):
    monkeypatch.setenv("CORS_ORIGINS", origins)
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()

def test_split_deploy_origin_is_allowed(db, monkeypatch):
    client = _client_for_origins(monkeypatch, NETLIFY)
    r = client.get("/get_all_hw_names", headers={"Origin": NETLIFY})
    assert r.headers.get("Access-Control-Allow-Origin") == NETLIFY

def test_local_frontend_stays_allowed_alongside_a_split_origin(db, monkeypatch):
    client = _client_for_origins(monkeypatch, NETLIFY)
    r = client.get("/get_all_hw_names", headers={"Origin": FRONTEND})
    assert r.headers.get("Access-Control-Allow-Origin") == FRONTEND

def test_unlisted_origin_stays_blocked_when_a_split_origin_is_set(db, monkeypatch):
    client = _client_for_origins(monkeypatch, NETLIFY)
    r = client.get("/get_all_hw_names", headers={"Origin": "http://evil.example"})
    assert "Access-Control-Allow-Origin" not in r.headers

def test_several_origins_and_a_trailing_slash(db, monkeypatch):
    preview = "https://preview.netlify.app"
    client = _client_for_origins(monkeypatch, f" {NETLIFY}/ , {preview} ")
    for origin in (NETLIFY, preview):
        r = client.get("/get_all_hw_names", headers={"Origin": origin})
        assert r.headers.get("Access-Control-Allow-Origin") == origin

def test_preflight_from_the_split_origin(db, monkeypatch):
    client = _client_for_origins(monkeypatch, NETLIFY)
    r = client.options("/login", headers={
        "Origin": NETLIFY,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert r.headers.get("Access-Control-Allow-Origin") == NETLIFY
    assert "POST" in r.headers.get("Access-Control-Allow-Methods", "")
    assert "content-type" in r.headers.get("Access-Control-Allow-Headers", "").lower()


# ---- serving the built frontend (Docker image) ----

@pytest.fixture
def built_frontend(tmp_path):
    (tmp_path / "index.html").write_text('<div id="root"></div>')
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('haas')")
    return tmp_path

@pytest.fixture
def static_client(db, monkeypatch, built_frontend):
    monkeypatch.setenv("STATIC_DIR", str(built_frontend))
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()

def test_root_serves_index_html(static_client):
    r = static_client.get("/")
    assert r.status_code == 200
    assert '<div id="root">' in r.get_data(as_text=True)

def test_assets_are_served(static_client):
    r = static_client.get("/assets/app.js")
    assert r.status_code == 200
    assert "haas" in r.get_data(as_text=True)

def test_api_routes_still_win_over_static_files(static_client):
    r = static_client.post("/login", json={})
    assert r.status_code == 400
    assert r.get_json()["error"] == "A user ID is required."

def test_missing_static_file_is_404(static_client):
    assert static_client.get("/assets/missing.js").status_code == 404

def test_without_static_dir_there_is_no_page(client, monkeypatch):
    monkeypatch.delenv("STATIC_DIR", raising=False)
    assert client.get("/").status_code == 404


# ---- health ----

def test_health_is_ok_when_the_database_answers(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.get_json() == {"status": "ok"}

def test_health_is_503_when_the_database_does_not_answer(client, monkeypatch):
    from pymongo.errors import ServerSelectionTimeoutError
    from mongodb import connection

    def down():
        raise ServerSelectionTimeoutError("no servers")
    monkeypatch.setattr(connection, "ping", down)
    r = client.get("/health")
    assert r.status_code == 503
    assert "error" in r.get_json()

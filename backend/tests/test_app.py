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

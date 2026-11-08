import os

from flask import Flask

from .auth_routes import bp as auth_bp
from .hw_routes import bp as hw_bp
from .project_routes import bp as project_bp
from .errors import register_error_handlers

from flask_cors import CORS



# No request this API accepts is anywhere near this large.
MAX_BODY_BYTES = 16 * 1024


def create_app() -> Flask:
    # In the Docker image, STATIC_DIR is the built frontend, so this one server hosts both the page and the API.
    # When it is unset (local development), nothing changes: Vite serves the page on port 5173.
    static_dir = os.environ.get("STATIC_DIR")
    if static_dir:
        app = Flask(__name__, static_folder=static_dir, static_url_path="")
        app.add_url_rule("/", "index", lambda: app.send_static_file("index.html"))
    else:
        app = Flask(__name__)
    
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})
    app.config["MAX_CONTENT_LENGTH"] = MAX_BODY_BYTES
    register_error_handlers(app)
    for bp in (auth_bp, project_bp, hw_bp):
        app.register_blueprint(bp)
    return app


app = create_app()


if __name__ == "__main__":
    # MacOS' AirPlay service uses port 5000, so we use 5001 for Flask. The frontend is on 5173 (normal and not unusually...).
    app.run(host="127.0.0.1", port=5001, debug=os.environ.get("FLASK_DEBUG") == "1")

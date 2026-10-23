import os

from flask import Flask

from .auth_routes import bp as auth_bp
from .hw_routes import bp as hw_bp
from .project_routes import bp as project_bp
from .errors import register_error_handlers

# No request this API accepts is anywhere near this large.
MAX_BODY_BYTES = 16 * 1024


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_BODY_BYTES
    register_error_handlers(app)
    for bp in (auth_bp, project_bp, hw_bp):
        app.register_blueprint(bp)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")

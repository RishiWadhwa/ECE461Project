from flask import Flask, jsonify
from pymongo.errors import ConnectionFailure
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    """Raise this anywhere in a route or service to answer with {"error": message} and that status."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _error_response(status: int, message: str):
    return jsonify({"error": message}), status


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(e: ApiError):
        return _error_response(e.status, e.message)

    # Flask's own errors (unknown route, wrong method, oversized body) would otherwise come back as HTML.
    @app.errorhandler(HTTPException)
    def handle_http_exception(e: HTTPException):
        return _error_response(e.code or 500, e.description or "Request failed")

    # The frontend treats 502/503/504 as "server offline", so an unreachable database must be a 503.
    @app.errorhandler(ConnectionFailure)
    def handle_db_unreachable(e: ConnectionFailure):
        app.logger.error("MongoDB unreachable: %s", type(e).__name__)
        return _error_response(503, "The database is unavailable. Please try again shortly.")

    # Last resort. The details go to the server log only. Request bodies are
    # never logged, because the auth routes carry plaintext passwords.
    @app.errorhandler(Exception)
    def handle_unexpected(e: Exception):
        app.logger.exception("Unhandled error")
        return _error_response(500, "Something went wrong on the server.")

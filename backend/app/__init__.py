import os
from datetime import timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from .models import db
from .config import Config


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=app.config["JWT_ACCESS_TOKEN_EXPIRES"])

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    Migrate(app, db)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    jwt = JWTManager(app)

    # JWT error handlers
    @jwt.unauthorized_loader
    def unauthorized_callback(error_string):
        return jsonify({"error": "Missing or invalid authorization token", "message": error_string}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({"error": "Invalid token", "message": error_string}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired", "message": "Please log in again"}), 401

    from .auth import auth_bp
    from .documents import documents_bp
    from .collections import collections_bp
    from .notifications import notifications_bp
    from .bot import bot_bp
    from .admin import admin_bp
    from .tickets import tickets_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(collections_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(bot_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(tickets_bp)

    @app.route("/api/health")
    def health_check():
        try:
            db.session.execute(db.text("SELECT 1"))
            db_status = "ok"
        except Exception:
            db_status = "error"
        return jsonify({"status": "ok", "database": db_status})

    with app.app_context():
        db.create_all()

    return app

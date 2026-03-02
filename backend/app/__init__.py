import os
from datetime import timedelta
from flask import Flask
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
    JWTManager(app)

    from .auth import auth_bp
    from .documents import documents_bp
    from .collections import collections_bp
    from .notifications import notifications_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(collections_bp)
    app.register_blueprint(notifications_bp)

    with app.app_context():
        db.create_all()

    return app

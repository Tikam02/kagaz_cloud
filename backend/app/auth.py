from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from .models import db, User, PasswordResetToken

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password") or not data.get("name"):
        return jsonify({"error": "Email, password, and name are required"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        email=data["email"],
        password_hash=generate_password_hash(data["password"]),
        name=data["name"],
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=data["email"]).first()
    if not user or not check_password_hash(user.password_hash, data["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()})


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "name" in data:
        name = data["name"].strip()
        if not name:
            return jsonify({"error": "Name cannot be empty"}), 400
        user.name = name

    if "phone" in data:
        user.phone = data["phone"].strip() or None

    if "email" in data:
        new_email = data["email"].strip().lower()
        if not new_email:
            return jsonify({"error": "Email cannot be empty"}), 400
        conflict = User.query.filter(User.email == new_email, User.id != user.id).first()
        if conflict:
            return jsonify({"error": "Email already in use"}), 409
        user.email = new_email

    db.session.commit()
    return jsonify({"user": user.to_dict()})


@auth_bp.route("/password", methods=["PUT"])
@jwt_required()
def change_password():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data or not data.get("current_password") or not data.get("new_password"):
        return jsonify({"error": "current_password and new_password are required"}), 400

    if not check_password_hash(user.password_hash, data["current_password"]):
        return jsonify({"error": "Current password is incorrect"}), 400

    if len(data["new_password"]) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    user.password_hash = generate_password_hash(data["new_password"])
    db.session.commit()
    return jsonify({"message": "Password updated successfully"})


# ── Password Reset ───────────────────────────────────────────

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    if not data or not data.get("email"):
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=data["email"]).first()
    # Always return success to prevent email enumeration
    if not user:
        return jsonify({"message": "If an account with that email exists, a reset token has been generated."})

    # Invalidate old tokens
    PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({"used": True})

    token = secrets.token_urlsafe(48)
    reset = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.session.add(reset)
    db.session.commit()

    # In production, send this token via email.
    # For now, return it directly (useful for development/testing).
    return jsonify({
        "message": "If an account with that email exists, a reset token has been generated.",
        "reset_token": token,
    })


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    if not data or not data.get("token") or not data.get("new_password"):
        return jsonify({"error": "Token and new_password are required"}), 400

    if len(data["new_password"]) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    reset = PasswordResetToken.query.filter_by(token=data["token"], used=False).first()
    if not reset:
        return jsonify({"error": "Invalid or expired reset token"}), 400

    if reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return jsonify({"error": "Reset token has expired"}), 400

    user = User.query.get(reset.user_id)
    user.password_hash = generate_password_hash(data["new_password"])
    reset.used = True
    db.session.commit()

    return jsonify({"message": "Password has been reset successfully"})


@auth_bp.route("/telegram/link-token", methods=["POST"])
@jwt_required()
def generate_telegram_link_token():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    token = secrets.token_hex(16)
    user.telegram_link_token = token
    db.session.commit()
    return jsonify({"token": token})


@auth_bp.route("/telegram/unlink", methods=["DELETE"])
@jwt_required()
def unlink_telegram():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.telegram_chat_id = None
    user.telegram_link_token = None
    db.session.commit()
    return jsonify({"message": "Telegram unlinked successfully"})


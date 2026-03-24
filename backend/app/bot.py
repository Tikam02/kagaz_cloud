from datetime import date
from flask import Blueprint, request, jsonify
from .models import db, User, Document

bot_bp = Blueprint("bot", __name__, url_prefix="/api/bot")


@bot_bp.route("/verify-telegram", methods=["POST"])
def verify_telegram():
    """Called by the Telegram bot when a user sends /start <token>."""
    data = request.get_json()
    token = data.get("token")
    chat_id = str(data.get("chat_id", ""))

    if not token or not chat_id:
        return jsonify({"error": "token and chat_id are required"}), 400

    user = User.query.filter_by(telegram_link_token=token).first()
    if not user:
        return jsonify({"error": "Invalid or expired token"}), 404

    # If another account already has this chat_id, clear it first
    existing = User.query.filter(
        User.telegram_chat_id == chat_id,
        User.id != user.id,
    ).first()
    if existing:
        existing.telegram_chat_id = None

    user.telegram_chat_id = chat_id
    user.telegram_link_token = None  # single-use token
    db.session.commit()

    return jsonify({"name": user.name, "email": user.email})


@bot_bp.route("/unlink", methods=["POST"])
def unlink_telegram():
    """Called by the bot when a user sends /unlink."""
    data = request.get_json()
    chat_id = str(data.get("chat_id", ""))

    user = User.query.filter_by(telegram_chat_id=chat_id).first()
    if not user:
        return jsonify({"error": "No linked account found"}), 404

    user.telegram_chat_id = None
    db.session.commit()
    return jsonify({"message": "Unlinked successfully"})


@bot_bp.route("/alerts/<chat_id>", methods=["GET"])
def get_alerts_for_chat(chat_id):
    """Return upcoming document alerts for a given Telegram chat_id."""
    user = User.query.filter_by(telegram_chat_id=str(chat_id)).first()
    if not user:
        return jsonify({"error": "Not linked"}), 404

    today = date.today()
    docs = Document.query.filter(
        Document.user_id == user.id,
        Document.important_date.isnot(None),
    ).all()

    alerts = []
    for doc in docs:
        days = (doc.important_date - today).days
        if 0 <= days <= doc.reminder_days_before:
            alerts.append({
                "title": doc.title,
                "days_until": days,
                "label": doc.date_label or "Important date",
                "category": doc.category,
                "important_date": doc.important_date.isoformat(),
            })

    alerts.sort(key=lambda x: x["days_until"])
    return jsonify({"alerts": alerts, "user": user.name})


@bot_bp.route("/daily-alerts", methods=["GET"])
def daily_alerts():
    """
    Called by the bot scheduler every morning.
    Returns all alerts for all users who have linked their Telegram.
    """
    today = date.today()
    users = User.query.filter(User.telegram_chat_id.isnot(None)).all()

    result = []
    for user in users:
        docs = Document.query.filter(
            Document.user_id == user.id,
            Document.important_date.isnot(None),
        ).all()

        items = []
        for doc in docs:
            days = (doc.important_date - today).days
            # Only send if within the document's reminder window (max 30 days)
            if 0 <= days <= min(doc.reminder_days_before, 30):
                items.append({
                    "title": doc.title,
                    "days_until": days,
                    "label": doc.date_label or "Important date",
                    "category": doc.category,
                })

        if items:
            items.sort(key=lambda x: x["days_until"])
            result.append({
                "chat_id": user.telegram_chat_id,
                "name": user.name,
                "items": items,
            })

    return jsonify({"alerts": result})

from datetime import date, timedelta, datetime, timezone
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, Document, Notification

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


def generate_reminders(user_id):
    """Check for upcoming document dates and create notifications if not already created."""
    today = date.today()
    documents = Document.query.filter(
        Document.user_id == user_id,
        Document.important_date.isnot(None),
    ).all()

    for doc in documents:
        days_until = (doc.important_date - today).days
        if 0 <= days_until <= doc.reminder_days_before:
            # Check if a reminder already exists for this document today
            existing = Notification.query.filter(
                Notification.user_id == user_id,
                Notification.document_id == doc.id,
                Notification.created_at >= datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc),
            ).first()
            if not existing:
                label = doc.date_label or "Important date"
                if days_until == 0:
                    msg = f"{label} for \"{doc.title}\" is today!"
                else:
                    msg = f"{label} for \"{doc.title}\" is in {days_until} day{'s' if days_until != 1 else ''}."
                notif = Notification(
                    user_id=user_id,
                    document_id=doc.id,
                    message=msg,
                    type="reminder",
                )
                db.session.add(notif)

    db.session.commit()


@notifications_bp.route("", methods=["GET"])
@jwt_required()
def list_notifications():
    user_id = int(get_jwt_identity())
    generate_reminders(user_id)
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count,
    })


@notifications_bp.route("/<int:notif_id>/read", methods=["PUT"])
@jwt_required()
def mark_read(notif_id):
    user_id = int(get_jwt_identity())
    notif = Notification.query.filter_by(id=notif_id, user_id=user_id).first()
    if not notif:
        return jsonify({"error": "Notification not found"}), 404
    notif.is_read = True
    db.session.commit()
    return jsonify({"notification": notif.to_dict()})

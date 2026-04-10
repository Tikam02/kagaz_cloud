from functools import wraps
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from .models import db, User, Document, Collection, SupportTicket

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = User.query.get(int(get_jwt_identity()))
        if not user or not user.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


# ── Dashboard analytics ──────────────────────────────────────

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def stats():
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    total_users = User.query.count()
    new_users_30d = User.query.filter(User.created_at >= thirty_days_ago).count()
    new_users_7d = User.query.filter(User.created_at >= seven_days_ago).count()

    active_users_7d = User.query.filter(User.last_login >= seven_days_ago).count()
    active_users_30d = User.query.filter(User.last_login >= thirty_days_ago).count()

    total_documents = Document.query.count()
    total_collections = Collection.query.count()

    total_storage = db.session.query(func.coalesce(func.sum(Document.file_size), 0)).scalar()

    open_tickets = SupportTicket.query.filter(SupportTicket.status.in_(["open", "in_progress"])).count()
    total_tickets = SupportTicket.query.count()

    # Signups per day (last 30 days)
    signups_by_day = (
        db.session.query(
            func.date(User.created_at).label("day"),
            func.count(User.id).label("count"),
        )
        .filter(User.created_at >= thirty_days_ago)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
        .all()
    )

    # Documents by category
    docs_by_category = (
        db.session.query(Document.category, func.count(Document.id))
        .group_by(Document.category)
        .all()
    )

    return jsonify({
        "users": {
            "total": total_users,
            "new_30d": new_users_30d,
            "new_7d": new_users_7d,
            "active_7d": active_users_7d,
            "active_30d": active_users_30d,
        },
        "documents": {
            "total": total_documents,
            "total_storage_bytes": total_storage,
            "by_category": {cat: cnt for cat, cnt in docs_by_category},
        },
        "collections": {
            "total": total_collections,
        },
        "tickets": {
            "open": open_tickets,
            "total": total_tickets,
        },
        "signups_by_day": [{"day": str(day), "count": cnt} for day, cnt in signups_by_day],
    })


# ── User management ─────────────────────────────────────────

@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search = request.args.get("search", "").strip()

    query = User.query.order_by(User.created_at.desc())
    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "users": [u.to_admin_dict() for u in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
    })


@admin_bp.route("/users/<int:user_id>", methods=["GET"])
@admin_required
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({"user": user.to_admin_dict()})


@admin_bp.route("/users/<int:user_id>/toggle-admin", methods=["POST"])
@admin_required
def toggle_admin(user_id):
    current_user_id = int(get_jwt_identity())
    if user_id == current_user_id:
        return jsonify({"error": "Cannot change your own admin status"}), 400
    user = User.query.get_or_404(user_id)
    user.is_admin = not user.is_admin
    db.session.commit()
    return jsonify({"user": user.to_admin_dict()})


# ── Ticket management (admin side) ──────────────────────────

@admin_bp.route("/tickets", methods=["GET"])
@admin_required
def list_tickets():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status = request.args.get("status", "").strip()

    query = SupportTicket.query.order_by(SupportTicket.created_at.desc())
    if status:
        query = query.filter_by(status=status)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "tickets": [t.to_dict() for t in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
    })


@admin_bp.route("/tickets/<int:ticket_id>", methods=["PUT"])
@admin_required
def update_ticket(ticket_id):
    ticket = SupportTicket.query.get_or_404(ticket_id)
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "status" in data:
        if data["status"] not in ("open", "in_progress", "resolved", "closed"):
            return jsonify({"error": "Invalid status"}), 400
        ticket.status = data["status"]
        if data["status"] == "resolved":
            ticket.resolved_at = datetime.now(timezone.utc)

    if "admin_reply" in data:
        ticket.admin_reply = data["admin_reply"]

    if "priority" in data:
        if data["priority"] not in ("low", "medium", "high"):
            return jsonify({"error": "Invalid priority"}), 400
        ticket.priority = data["priority"]

    db.session.commit()
    return jsonify({"ticket": ticket.to_dict()})

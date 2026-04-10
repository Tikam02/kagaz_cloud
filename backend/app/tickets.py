from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from .models import db, User, SupportTicket

tickets_bp = Blueprint("tickets", __name__, url_prefix="/api/tickets")


@tickets_bp.route("", methods=["POST"])
@jwt_required()
def create_ticket():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data or not data.get("subject") or not data.get("description"):
        return jsonify({"error": "Subject and description are required"}), 400

    category = data.get("category", "general")
    if category not in ("general", "bug", "feature", "account"):
        category = "general"

    priority = data.get("priority", "medium")
    if priority not in ("low", "medium", "high"):
        priority = "medium"

    ticket = SupportTicket(
        user_id=user.id,
        subject=data["subject"][:200],
        description=data["description"],
        category=category,
        priority=priority,
    )
    db.session.add(ticket)
    db.session.commit()
    return jsonify({"ticket": ticket.to_dict()}), 201


@tickets_bp.route("", methods=["GET"])
@jwt_required()
def list_my_tickets():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    tickets = (
        SupportTicket.query
        .filter_by(user_id=user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return jsonify({"tickets": [t.to_dict() for t in tickets]})


@tickets_bp.route("/<int:ticket_id>", methods=["GET"])
@jwt_required()
def get_ticket(ticket_id):
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    ticket = SupportTicket.query.get_or_404(ticket_id)
    if ticket.user_id != user.id and not user.is_admin:
        return jsonify({"error": "Access denied"}), 403

    return jsonify({"ticket": ticket.to_dict()})

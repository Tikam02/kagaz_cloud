import os
import uuid
from datetime import date
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, Document

documents_bp = Blueprint("documents", __name__, url_prefix="/api/documents")

CATEGORY_KEYWORDS = {
    "license": ["license", "permit", "certification", "certified"],
    "bill": ["bill", "invoice", "payment", "utility", "electricity", "water", "gas"],
    "insurance": ["insurance", "policy", "coverage", "claim"],
    "tax": ["tax", "w2", "w-2", "1099", "return", "irs"],
    "contract": ["contract", "agreement", "lease", "rental"],
    "receipt": ["receipt", "purchase", "order"],
}


def detect_category(title, filename):
    text = f"{title} {filename}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "other"


@documents_bp.route("", methods=["GET"])
@jwt_required()
def list_documents():
    user_id = int(get_jwt_identity())
    query = Document.query.filter_by(user_id=user_id)

    category = request.args.get("category")
    if category:
        query = query.filter_by(category=category)

    collection_id = request.args.get("collection_id")
    if collection_id:
        query = query.filter_by(collection_id=int(collection_id))

    search = request.args.get("search")
    if search:
        query = query.filter(
            db.or_(
                Document.title.ilike(f"%{search}%"),
                Document.description.ilike(f"%{search}%"),
            )
        )

    documents = query.order_by(Document.created_at.desc()).all()
    return jsonify({"documents": [d.to_dict() for d in documents]})


@documents_bp.route("", methods=["POST"])
@jwt_required()
def create_document():
    user_id = int(get_jwt_identity())

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    title = request.form.get("title", file.filename)
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_name)
    file.save(file_path)

    file_size = os.path.getsize(file_path)
    category = request.form.get("category") or detect_category(title, file.filename)

    important_date = request.form.get("important_date")
    if important_date:
        important_date = date.fromisoformat(important_date)

    tags = request.form.get("tags")
    if tags:
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    else:
        tags = []

    collection_id = request.form.get("collection_id")
    if collection_id:
        collection_id = int(collection_id)

    doc = Document(
        user_id=user_id,
        title=title,
        description=request.form.get("description", ""),
        file_path=unique_name,
        file_type=ext.lstrip(".") if ext else "unknown",
        file_size=file_size,
        category=category,
        tags=tags,
        important_date=important_date,
        date_label=request.form.get("date_label"),
        reminder_days_before=int(request.form.get("reminder_days_before", 30)),
        collection_id=collection_id,
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify({"document": doc.to_dict()}), 201


@documents_bp.route("/<int:doc_id>", methods=["GET"])
@jwt_required()
def get_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    return jsonify({"document": doc.to_dict()})


@documents_bp.route("/<int:doc_id>", methods=["PUT"])
@jwt_required()
def update_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    data = request.get_json()
    for field in ["title", "description", "category", "date_label"]:
        if field in data:
            setattr(doc, field, data[field])

    if "important_date" in data:
        doc.important_date = date.fromisoformat(data["important_date"]) if data["important_date"] else None

    if "reminder_days_before" in data:
        doc.reminder_days_before = int(data["reminder_days_before"])

    if "tags" in data:
        doc.tags = data["tags"]

    if "collection_id" in data:
        doc.collection_id = data["collection_id"]

    db.session.commit()
    return jsonify({"document": doc.to_dict()})


@documents_bp.route("/<int:doc_id>", methods=["DELETE"])
@jwt_required()
def delete_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], doc.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.session.delete(doc)
    db.session.commit()
    return jsonify({"message": "Document deleted"})


@documents_bp.route("/<int:doc_id>/download", methods=["GET"])
@jwt_required()
def download_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], doc.file_path)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on disk"}), 404

    return send_file(file_path, as_attachment=True, download_name=f"{doc.title}.{doc.file_type}")

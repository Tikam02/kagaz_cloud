from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, Collection, Document

collections_bp = Blueprint("collections", __name__, url_prefix="/api/collections")


@collections_bp.route("", methods=["GET"])
@jwt_required()
def list_collections():
    user_id = int(get_jwt_identity())
    collections = Collection.query.filter_by(user_id=user_id).order_by(Collection.name).all()
    return jsonify({"collections": [c.to_dict() for c in collections]})


@collections_bp.route("", methods=["POST"])
@jwt_required()
def create_collection():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Name is required"}), 400

    collection = Collection(
        user_id=user_id,
        name=data["name"],
        description=data.get("description", ""),
        icon=data.get("icon", "folder"),
        color=data.get("color", "#3B82F6"),
        parent_id=data.get("parent_id"),
    )
    db.session.add(collection)
    db.session.commit()

    return jsonify({"collection": collection.to_dict()}), 201


@collections_bp.route("/<int:col_id>", methods=["PUT"])
@jwt_required()
def update_collection(col_id):
    user_id = int(get_jwt_identity())
    collection = Collection.query.filter_by(id=col_id, user_id=user_id).first()
    if not collection:
        return jsonify({"error": "Collection not found"}), 404

    data = request.get_json()
    for field in ["name", "description", "icon", "color", "parent_id"]:
        if field in data:
            setattr(collection, field, data[field])

    db.session.commit()
    return jsonify({"collection": collection.to_dict()})


@collections_bp.route("/<int:col_id>", methods=["DELETE"])
@jwt_required()
def delete_collection(col_id):
    user_id = int(get_jwt_identity())
    collection = Collection.query.filter_by(id=col_id, user_id=user_id).first()
    if not collection:
        return jsonify({"error": "Collection not found"}), 404

    # Unlink documents from this collection
    Document.query.filter_by(collection_id=col_id).update({"collection_id": None})
    db.session.delete(collection)
    db.session.commit()
    return jsonify({"message": "Collection deleted"})


@collections_bp.route("/<int:col_id>/documents", methods=["GET"])
@jwt_required()
def collection_documents(col_id):
    user_id = int(get_jwt_identity())
    collection = Collection.query.filter_by(id=col_id, user_id=user_id).first()
    if not collection:
        return jsonify({"error": "Collection not found"}), 404

    documents = Document.query.filter_by(user_id=user_id, collection_id=col_id).order_by(Document.created_at.desc()).all()
    return jsonify({"collection": collection.to_dict(), "documents": [d.to_dict() for d in documents]})

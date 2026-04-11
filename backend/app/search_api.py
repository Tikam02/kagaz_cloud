"""Search API endpoints powered by OpenSearch."""

import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import search as search_service

logger = logging.getLogger(__name__)

search_bp = Blueprint("search", __name__, url_prefix="/api/search")


@search_bp.route("", methods=["GET"])
@jwt_required()
def search_documents():
    """
    Full-text + faceted search.

    Query params:
        q         - search query (full-text)
        category  - filter by category
        tags      - filter by tag (repeat for multiple)
        file_type - filter by file type
        date_from - filter created_at >= (ISO date)
        date_to   - filter created_at <= (ISO date)
        collection_id - filter by collection
        sort      - relevance | date_desc | date_asc | title | size
        page      - page number (default 1)
        size      - results per page (default 20, max 100)
    """
    user_id = int(get_jwt_identity())

    q = request.args.get("q", "").strip()
    category = request.args.get("category")
    tags = request.args.getlist("tags") or None
    file_type = request.args.get("file_type")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    collection_id = request.args.get("collection_id")
    sort_by = request.args.get("sort", "relevance")
    page = max(1, int(request.args.get("page", 1)))
    size = min(100, max(1, int(request.args.get("size", 20))))

    result = search_service.search_documents(
        user_id=user_id,
        query=q or None,
        category=category,
        tags=tags,
        file_type=file_type,
        date_from=date_from,
        date_to=date_to,
        collection_id=collection_id,
        sort_by=sort_by,
        page=page,
        size=size,
    )

    if result is None:
        # OpenSearch unavailable — fall back to DB search
        return _db_fallback_search(user_id, q, category, collection_id)

    return jsonify(result)


@search_bp.route("/reindex", methods=["POST"])
@jwt_required()
def reindex():
    """Reindex all documents for the current user."""
    user_id = int(get_jwt_identity())
    count = search_service.reindex_all_for_user(user_id)
    return jsonify({"message": f"Reindexed {count} documents", "count": count})


def _db_fallback_search(user_id, search_query, category, collection_id):
    """Simple DB-based fallback when OpenSearch is unavailable."""
    from .models import db, Document

    query = Document.query.filter_by(user_id=user_id)

    if category:
        query = query.filter_by(category=category)
    if collection_id:
        query = query.filter_by(collection_id=int(collection_id))
    if search_query:
        pattern = f"%{search_query}%"
        query = query.filter(
            db.or_(
                Document.title.ilike(pattern),
                Document.description.ilike(pattern),
                Document.category.ilike(pattern),
                Document.date_label.ilike(pattern),
                Document.tags.cast(db.String).ilike(pattern),
                Document.metadata_extracted.cast(db.String).ilike(pattern),
            )
        )

    docs = query.order_by(Document.created_at.desc()).limit(100).all()

    return jsonify({
        "hits": [d.to_dict() for d in docs],
        "total": len(docs),
        "aggregations": {},
        "fallback": True,
    })

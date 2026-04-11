"""
OpenSearch integration for full-text + faceted document search.

Provides indexing, searching, and management of the documents index.
"""

import logging
import os
from opensearchpy import OpenSearch, exceptions as os_exceptions

logger = logging.getLogger(__name__)

INDEX_NAME = "kagaz_documents"

_client = None


def get_client() -> OpenSearch | None:
    """Return the singleton OpenSearch client, or None if not configured."""
    global _client
    if _client is not None:
        return _client

    host = os.environ.get("OPENSEARCH_HOST", "localhost")
    port = int(os.environ.get("OPENSEARCH_PORT", 9200))
    user = os.environ.get("OPENSEARCH_USER", "admin")
    password = os.environ.get("OPENSEARCH_PASSWORD", "admin")
    use_ssl = os.environ.get("OPENSEARCH_USE_SSL", "false").lower() == "true"

    try:
        _client = OpenSearch(
            hosts=[{"host": host, "port": port}],
            http_compress=True,
            http_auth=(user, password) if user else None,
            use_ssl=use_ssl,
            verify_certs=False,
            ssl_assert_hostname=False,
            ssl_show_warn=False,
            timeout=10,
        )
        # Verify connection
        info = _client.info()
        logger.info("Connected to OpenSearch %s", info.get("version", {}).get("number"))
    except Exception:
        logger.info("OpenSearch not available — search will fall back to database")
        _client = None

    return _client


INDEX_MAPPING = {
    "settings": {
        "index": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
        },
        "analysis": {
            "analyzer": {
                "document_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "stop", "snowball"],
                }
            }
        },
    },
    "mappings": {
        "properties": {
            "user_id": {"type": "integer"},
            "title": {
                "type": "text",
                "analyzer": "document_analyzer",
                "fields": {"keyword": {"type": "keyword"}},
            },
            "description": {"type": "text", "analyzer": "document_analyzer"},
            "content": {"type": "text", "analyzer": "document_analyzer"},
            "category": {"type": "keyword"},
            "tags": {"type": "keyword"},
            "file_type": {"type": "keyword"},
            "file_size": {"type": "integer"},
            "date_label": {"type": "keyword"},
            "important_date": {"type": "date", "format": "yyyy-MM-dd||epoch_millis", "ignore_malformed": True},
            "created_at": {"type": "date"},
            "updated_at": {"type": "date"},
            "collection_id": {"type": "integer"},
            # Extracted metadata fields
            "amounts": {"type": "keyword"},
            "headline": {"type": "text", "analyzer": "document_analyzer"},
            "summary": {"type": "text", "analyzer": "document_analyzer"},
            "doc_author": {"type": "keyword"},
        }
    },
}


def ensure_index():
    """Create the index if it doesn't exist."""
    client = get_client()
    if not client:
        return False
    try:
        if not client.indices.exists(index=INDEX_NAME):
            client.indices.create(index=INDEX_NAME, body=INDEX_MAPPING)
            logger.info("Created OpenSearch index '%s'", INDEX_NAME)
        return True
    except Exception:
        logger.error("Failed to create OpenSearch index", exc_info=True)
        return False


def _build_doc_body(doc, full_text=None):
    """Build the OpenSearch document body from a Document model instance."""
    meta = doc.metadata_extracted or {}

    body = {
        "user_id": doc.user_id,
        "title": doc.title,
        "description": doc.description or "",
        "content": full_text or meta.get("full_text_preview", "") or "",
        "category": doc.category,
        "tags": doc.tags or [],
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "date_label": doc.date_label,
        "important_date": doc.important_date.isoformat() if doc.important_date else None,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        "collection_id": doc.collection_id,
        "amounts": meta.get("amounts", []),
        "headline": meta.get("headline"),
        "summary": meta.get("summary"),
        "doc_author": meta.get("doc_metadata", {}).get("author"),
    }
    return body


def index_document(doc, full_text=None):
    """Index or update a document in OpenSearch."""
    client = get_client()
    if not client:
        return False
    try:
        body = _build_doc_body(doc, full_text)
        client.index(
            index=INDEX_NAME,
            body=body,
            id=f"{doc.user_id}_{doc.id}",
            refresh=True,
        )
        logger.debug("Indexed document %s for user %s", doc.id, doc.user_id)
        return True
    except Exception:
        logger.warning("Failed to index document %s", doc.id, exc_info=True)
        return False


def update_document(doc):
    """Update an existing document in the index."""
    return index_document(doc)


def delete_document(doc_id, user_id):
    """Remove a document from the index."""
    client = get_client()
    if not client:
        return False
    try:
        client.delete(
            index=INDEX_NAME,
            id=f"{user_id}_{doc_id}",
            refresh=True,
        )
        logger.debug("Deleted document %s for user %s from index", doc_id, user_id)
        return True
    except os_exceptions.NotFoundError:
        return True  # Already gone
    except Exception:
        logger.warning("Failed to delete document %s from index", doc_id, exc_info=True)
        return False


def search_documents(user_id, query=None, category=None, tags=None,
                     file_type=None, date_from=None, date_to=None,
                     collection_id=None, sort_by="relevance",
                     page=1, size=20):
    """
    Full-text + faceted search across a user's documents.

    Returns: {hits: [...], total: int, aggregations: {...}}
    """
    client = get_client()
    if not client:
        return None  # Caller should fall back to DB

    must = [{"term": {"user_id": user_id}}]
    filters = []

    # Full-text query
    if query and query.strip():
        must.append({
            "multi_match": {
                "query": query,
                "fields": [
                    "title^3",
                    "headline^2",
                    "description^2",
                    "tags^3",
                    "category^2",
                    "summary",
                    "content",
                    "amounts",
                    "date_label",
                    "doc_author^2",
                    "file_type",
                ],
                "type": "best_fields",
                "fuzziness": "AUTO",
            }
        })

    # Facet filters
    if category:
        filters.append({"term": {"category": category}})
    if tags:
        tag_list = tags if isinstance(tags, list) else [tags]
        for tag in tag_list:
            filters.append({"term": {"tags": tag}})
    if file_type:
        filters.append({"term": {"file_type": file_type}})
    if collection_id is not None:
        filters.append({"term": {"collection_id": int(collection_id)}})
    if date_from or date_to:
        date_range = {}
        if date_from:
            date_range["gte"] = date_from
        if date_to:
            date_range["lte"] = date_to
        filters.append({"range": {"created_at": date_range}})

    # Sort
    sort_clause = []
    if sort_by == "date_desc":
        sort_clause = [{"created_at": {"order": "desc"}}]
    elif sort_by == "date_asc":
        sort_clause = [{"created_at": {"order": "asc"}}]
    elif sort_by == "title":
        sort_clause = [{"title.keyword": {"order": "asc"}}]
    elif sort_by == "size":
        sort_clause = [{"file_size": {"order": "desc"}}]
    elif query and query.strip():
        sort_clause = [{"_score": {"order": "desc"}}]
    else:
        sort_clause = [{"created_at": {"order": "desc"}}]

    body = {
        "query": {
            "bool": {
                "must": must,
                "filter": filters,
            }
        },
        "sort": sort_clause,
        "from": (page - 1) * size,
        "size": size,
        "highlight": {
            "fields": {
                "content": {"fragment_size": 150, "number_of_fragments": 3},
                "title": {},
                "description": {"fragment_size": 150, "number_of_fragments": 2},
            },
            "pre_tags": ["<mark>"],
            "post_tags": ["</mark>"],
        },
        "aggs": {
            "categories": {"terms": {"field": "category", "size": 20}},
            "tags": {"terms": {"field": "tags", "size": 30}},
            "file_types": {"terms": {"field": "file_type", "size": 20}},
            "date_labels": {"terms": {"field": "date_label", "size": 10}},
        },
    }

    try:
        response = client.search(index=INDEX_NAME, body=body)

        hits = []
        for hit in response["hits"]["hits"]:
            source = hit["_source"]
            source["id"] = int(hit["_id"].split("_", 1)[1])
            source["_score"] = hit.get("_score")
            source["highlights"] = hit.get("highlight", {})
            # Don't return bulk content to the frontend
            source.pop("content", None)
            hits.append(source)

        aggs = {}
        for agg_name, agg_data in response.get("aggregations", {}).items():
            aggs[agg_name] = [
                {"key": bucket["key"], "count": bucket["doc_count"]}
                for bucket in agg_data.get("buckets", [])
            ]

        return {
            "hits": hits,
            "total": response["hits"]["total"]["value"],
            "aggregations": aggs,
        }
    except Exception:
        logger.error("OpenSearch query failed", exc_info=True)
        return None


def reindex_all_for_user(user_id):
    """Reindex all documents for a given user. Returns count indexed."""
    from .models import Document
    client = get_client()
    if not client:
        return 0

    docs = Document.query.filter_by(user_id=user_id).all()
    count = 0
    for doc in docs:
        if index_document(doc):
            count += 1
    return count


def reindex_all():
    """Reindex every document in the database. Returns count indexed."""
    from .models import Document
    client = get_client()
    if not client:
        return 0

    # Delete and recreate the index for a clean reindex
    try:
        if client.indices.exists(index=INDEX_NAME):
            client.indices.delete(index=INDEX_NAME)
        client.indices.create(index=INDEX_NAME, body=INDEX_MAPPING)
    except Exception:
        logger.error("Failed to recreate index for reindex", exc_info=True)
        return 0

    docs = Document.query.all()
    count = 0
    for doc in docs:
        if index_document(doc):
            count += 1
    return count

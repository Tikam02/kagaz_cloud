from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    documents = db.relationship("Document", backref="owner", lazy=True, cascade="all, delete-orphan")
    collections = db.relationship("Collection", backref="owner", lazy=True, cascade="all, delete-orphan")
    notifications = db.relationship("Notification", backref="user", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
        }


class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    category = db.Column(db.String(50), default="other")
    tags = db.Column(db.JSON, default=list)
    important_date = db.Column(db.Date, nullable=True)
    date_label = db.Column(db.String(100), nullable=True)
    reminder_days_before = db.Column(db.Integer, default=30)
    collection_id = db.Column(db.Integer, db.ForeignKey("collection.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    notifications = db.relationship("Notification", backref="document", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "category": self.category,
            "tags": self.tags or [],
            "important_date": self.important_date.isoformat() if self.important_date else None,
            "date_label": self.date_label,
            "reminder_days_before": self.reminder_days_before,
            "collection_id": self.collection_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Collection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(50), default="folder")
    color = db.Column(db.String(20), default="#3B82F6")
    parent_id = db.Column(db.Integer, db.ForeignKey("collection.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    documents = db.relationship("Document", backref="collection", lazy=True)
    children = db.relationship("Collection", backref=db.backref("parent", remote_side="Collection.id"), lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "color": self.color,
            "parent_id": self.parent_id,
            "created_at": self.created_at.isoformat(),
            "document_count": len(self.documents),
        }


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    document_id = db.Column(db.Integer, db.ForeignKey("document.id"), nullable=True)
    message = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(20), default="reminder")
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "document_id": self.document_id,
            "message": self.message,
            "type": self.type,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }

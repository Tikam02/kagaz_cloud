"""add document metadata_extracted column

Revision ID: a3f1e8c72d4b
Revises: 8b1d56d999b7
Create Date: 2026-04-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3f1e8c72d4b'
down_revision = '8b1d56d999b7'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('document', schema=None) as batch_op:
        batch_op.add_column(sa.Column('metadata_extracted', sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table('document', schema=None) as batch_op:
        batch_op.drop_column('metadata_extracted')

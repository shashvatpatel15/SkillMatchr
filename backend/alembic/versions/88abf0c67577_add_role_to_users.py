"""add_role_to_users

Revision ID: 88abf0c67577
Revises: fb79bf2f350b
Create Date: 2026-04-11 02:03:32.746647

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '88abf0c67577'
down_revision: Union[str, None] = 'fb79bf2f350b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('role', sa.String(50), server_default='recruiter', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'role')

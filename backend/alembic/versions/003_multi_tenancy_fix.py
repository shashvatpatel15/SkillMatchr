"""Add created_by to employees and referrals for multi-tenancy

Revision ID: 003_multi_tenancy_fix
Revises: c692b0def6b9
Create Date: 2026-04-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers
revision = '003_multi_tenancy_fix'
down_revision = 'c692b0def6b9'
branch_labels = None
depends_on = '002_jobs_employees_referrals'


def upgrade() -> None:
    # Add created_by to employees
    op.add_column('employees', sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True))

    # Add created_by to referrals
    op.add_column('referrals', sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True))


def downgrade() -> None:
    op.drop_column('referrals', 'created_by')
    op.drop_column('employees', 'created_by')

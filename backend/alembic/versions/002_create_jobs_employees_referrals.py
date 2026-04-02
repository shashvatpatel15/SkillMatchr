"""Create jobs, employees, referrals, referral_rewards tables

Revision ID: 002_jobs_employees_referrals
Revises: c692b0def6b9
Create Date: 2026-04-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy.vector

# revision identifiers, used by Alembic.
revision: str = '002_jobs_employees_referrals'
down_revision: Union[str, None] = 'c692b0def6b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── jobs ─────────────────────────────────────────────────────────
    op.create_table(
        'jobs',
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('company', sa.String(255), nullable=True),
        sa.Column('department', sa.String(255), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('employment_type', sa.String(50), nullable=True, server_default='full_time'),
        sa.Column('experience_required', sa.Float(), nullable=True),
        sa.Column('salary_min', sa.Float(), nullable=True),
        sa.Column('salary_max', sa.Float(), nullable=True),
        sa.Column('skills_required', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('job_description', sa.Text(), nullable=True),
        sa.Column('embedding', pgvector.sqlalchemy.vector.VECTOR(dim=768), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='open'),
        sa.Column('created_by', sa.UUID(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_jobs_title', 'jobs', ['title'])
    op.create_index('ix_jobs_status', 'jobs', ['status'])

    # ── employees ─────────────────────────────────────────────────────
    op.create_table(
        'employees',
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('department', sa.String(255), nullable=True),
        sa.Column('company', sa.String(255), nullable=True),
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_employees_email'),
    )
    op.create_index('ix_employees_email', 'employees', ['email'])

    # ── referrals ─────────────────────────────────────────────────────
    op.create_table(
        'referrals',
        sa.Column('employee_id', sa.UUID(), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('candidate_id', sa.UUID(), sa.ForeignKey('candidates.id'), nullable=False),
        sa.Column('job_id', sa.UUID(), sa.ForeignKey('jobs.id'), nullable=False),
        sa.Column('status', sa.String(30), nullable=False, server_default='referred'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('referred_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_referrals_employee_id', 'referrals', ['employee_id'])
    op.create_index('ix_referrals_status', 'referrals', ['status'])

    # ── referral_rewards ──────────────────────────────────────────────
    op.create_table(
        'referral_rewards',
        sa.Column('employee_id', sa.UUID(), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('referral_id', sa.UUID(), sa.ForeignKey('referrals.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('status', sa.String(30), nullable=False, server_default='pending'),
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('referral_rewards')
    op.drop_table('referrals')
    op.drop_table('employees')
    op.drop_index('ix_jobs_status', table_name='jobs')
    op.drop_index('ix_jobs_title', table_name='jobs')
    op.drop_table('jobs')

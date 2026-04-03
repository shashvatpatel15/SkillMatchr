"""merge heads

Revision ID: 633e0e4fb3df
Revises: 002_jobs_employees_referrals, 003_multi_tenancy_fix
Create Date: 2026-04-04 00:28:29.665634

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '633e0e4fb3df'
down_revision: Union[str, None] = ('002_jobs_employees_referrals', '003_multi_tenancy_fix')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

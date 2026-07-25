"""add scrape_blocked error code

Revision ID: f4ac41cd24b4
Revises: 52b3c231f0e0
Create Date: 2026-07-25 16:18:48.125361

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4ac41cd24b4'
down_revision: Union[str, Sequence[str], None] = '52b3c231f0e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_OLD_VALUES = ('PROFILE_PRIVATE', 'PROFILE_NOT_FOUND', 'EMPTY_HISTORY', 'INVALID_EXPORT', 'INTERNAL_ERROR')
_NEW_VALUES = ('PROFILE_PRIVATE', 'PROFILE_NOT_FOUND', 'SCRAPE_BLOCKED', 'EMPTY_HISTORY', 'INVALID_EXPORT', 'INTERNAL_ERROR')


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('analyses') as batch_op:
        batch_op.alter_column(
            'error_code',
            existing_type=sa.Enum(*_OLD_VALUES, name='errorcode'),
            type_=sa.Enum(*_NEW_VALUES, name='errorcode'),
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('analyses') as batch_op:
        batch_op.alter_column(
            'error_code',
            existing_type=sa.Enum(*_NEW_VALUES, name='errorcode'),
            type_=sa.Enum(*_OLD_VALUES, name='errorcode'),
        )

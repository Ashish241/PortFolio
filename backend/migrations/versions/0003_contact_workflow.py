"""Contact workflow and notification delivery state; preserve existing messages."""
from alembic import op
import sqlalchemy as sa
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('contact_messages') as batch:
        batch.add_column(sa.Column('status', sa.String(16), server_default='NEW', nullable=False))
        batch.add_column(sa.Column('email_delivery_status', sa.String(16), server_default='PENDING', nullable=False))
        batch.create_check_constraint('ck_contact_status',"status IN ('NEW','READ','REPLIED','SPAM')")
        batch.create_check_constraint('ck_contact_delivery',"email_delivery_status IN ('PENDING','SENT','FAILED','DISABLED')")

def downgrade():
    with op.batch_alter_table('contact_messages') as batch:
        batch.drop_constraint('ck_contact_delivery',type_='check')
        batch.drop_constraint('ck_contact_status',type_='check')
        batch.drop_column('email_delivery_status')
        batch.drop_column('status')

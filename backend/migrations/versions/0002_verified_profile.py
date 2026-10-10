"""Verified candidate profile, education, and content revisions."""
from alembic import op
import sqlalchemy as sa
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("candidate_profile", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("name", sa.String(150), nullable=False), sa.Column("location", sa.String(150), nullable=False),
                    sa.Column("email", sa.String(254), nullable=False), sa.Column("github_url", sa.String(500), nullable=False),
                    sa.Column("linkedin_url", sa.String(500), nullable=False), sa.Column("summary", sa.Text(), nullable=False),
                    sa.Column("resume_sha256", sa.String(64), nullable=False))
    op.create_table("profile_roles", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("profile_id", sa.Integer(), sa.ForeignKey("candidate_profile.id", ondelete="CASCADE"), nullable=False),
                    sa.Column("title", sa.String(100), nullable=False), sa.Column("order", sa.Integer(), nullable=False))
    op.create_table("education", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("qualification", sa.String(200), nullable=False), sa.Column("institution", sa.String(200), nullable=False),
                    sa.Column("expected_year", sa.Integer(), nullable=False), sa.Column("grade", sa.String(80), nullable=False))
    op.create_table("content_revisions", sa.Column("key", sa.String(40), primary_key=True), sa.Column("digest", sa.String(64), nullable=False))


def downgrade():
    for table in ["content_revisions", "education", "profile_roles", "candidate_profile"]:
        op.drop_table(table)

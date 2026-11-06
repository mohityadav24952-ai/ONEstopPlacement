"""Feedback and bug reports from signed-in users, stored in the `feedbacks` table."""
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from sqlalchemy.orm import Session

from app.core.ratelimit import limit
from app.core.security import AuthUser, get_current_user
from app.db.models.feedback import Feedback
from app.db.models.profile import StudentProfile
from app.db.session import get_db
from app.modules.profile.router import current_profile

router = APIRouter(prefix="/feedback", tags=["feedback"])

# Leading/trailing whitespace is stripped before the length check, so "          " is rejected.
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=4000)]


class FeedbackIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["feedback", "bug"] = "feedback"
    text: Text
    page: str | None = Field(default=None, max_length=200)


class FeedbackOut(BaseModel):
    id: str
    created_at: str


# 5 an hour: plenty for real feedback, and a flood of rows is not possible.
@router.post("", status_code=201, dependencies=[Depends(limit("feedback", 5, 3600))])
def submit_feedback(body: FeedbackIn, user: AuthUser = Depends(get_current_user),
                    profile: StudentProfile = Depends(current_profile), db: Session = Depends(get_db)) -> FeedbackOut:
    row = Feedback(profile_id=profile.id, email=user.email, kind=body.kind, feedback_text=body.text, page=body.page)
    db.add(row)
    db.commit()
    return FeedbackOut(id=str(row.id), created_at=row.created_at.isoformat())

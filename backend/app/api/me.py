from fastapi import APIRouter, Depends

from app.core.security import AuthUser, get_current_user

router = APIRouter(tags=["me"])


@router.get("/me")
def read_me(user: AuthUser = Depends(get_current_user)) -> dict[str, str | None]:
    return {"id": user.id, "email": user.email}
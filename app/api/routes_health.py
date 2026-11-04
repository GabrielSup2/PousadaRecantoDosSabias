from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Health check")
def get_health():
    return {"status": "ok"}


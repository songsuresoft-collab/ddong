from fastapi import APIRouter, Query
from services.mcp_client import query_notebook

router = APIRouter()

KNOWLEDGE_NOTEBOOK_ID = "08b60625-8583-474c-a69d-347cd623ca28"

@router.get("/onboarding/guide")
async def get_onboarding_guide(force: bool = False):
    """온보딩 가이드 정보를 NotebookLM에서 가져옵니다."""
    cache_key = "onboarding_guide"
    prompt = "현재 온보딩 안내에 필요한 핵심 가이드를 3줄로 요약해서 제공해줘."
    
    result = await query_notebook(
        query=prompt,
        cache_key=cache_key,
        force=force,
        notebook_id=KNOWLEDGE_NOTEBOOK_ID
    )
    return result

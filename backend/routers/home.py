from services.mcp_client import query_notebook, register_preload_query
from fastapi import APIRouter, Query
import json, re, traceback

router = APIRouter()
CACHE_KEY = "home"

HOME_QUERY = """
최신 데이터를 종합 분석하여, 부서장 관점에서 이번 주 가장 중요한 핵심 이슈 및 의사결정 필요 사항 3가지를 아래 JSON 형식으로만 응답해줘. JSON 외 다른 텍스트는 포함하지 마.

{
  "summary": "부서 전체 상황 한 줄 요약",
  "key_issues": [
    {"title": "이슈 제목", "description": "내용 (50자 이내)", "urgency": "high 또는 medium 또는 low", "action": "필요 액션 (30자 이내)"},
    {"title": "이슈 제목", "description": "내용 (50자 이내)", "urgency": "high 또는 medium 또는 low", "action": "필요 액션 (30자 이내)"},
    {"title": "이슈 제목", "description": "내용 (50자 이내)", "urgency": "high 또는 medium 또는 low", "action": "필요 액션 (30자 이내)"}
  ],
  "kpi_snapshot": {"order_target": "목표수주액", "order_actual": "실적수주액", "order_rate": 달성률숫자, "sales_target": "목표매출액", "sales_actual": "실적매출액", "sales_rate": 달성률숫자},
  "risk_count": {"high": 숫자, "medium": 숫자, "low": 숫자}
}
"""

# 프리로딩 등록
register_preload_query(CACHE_KEY, HOME_QUERY)

# 폴백 데이터 — MCP가 완전히 실패해도 UI가 항상 작동하도록
FALLBACK_DATA = {
    "success": False,
    "summary": "AI 데이터 분석 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 새로고침을 시도해 주세요.",
    "key_issues": [
        {
            "title": "시스템 연결 대기 중",
            "description": "NotebookLM AI 분석 서비스가 초기화 중입니다.",
            "urgency": "medium",
            "action": "1~2분 후 새로고침"
        }
    ],
    "kpi_snapshot": {
        "order_target": "로딩 중",
        "order_actual": "로딩 중",
        "order_rate": 0,
        "sales_target": "로딩 중",
        "sales_actual": "로딩 중",
        "sales_rate": 0
    },
    "risk_count": {"high": 0, "medium": 0, "low": 0}
}


def _parse_json_from_answer(answer: str) -> dict:
    """AI 응답에서 JSON을 추출하여 파싱합니다."""
    # 코드 블록 제거
    answer = re.sub(r"```json\s*", "", answer)
    answer = re.sub(r"```\s*", "", answer)
    # JSON 블록 추출
    match = re.search(r"\{[\s\S]+\}", answer)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


@router.get("/home")
async def get_home(force: bool = Query(False, description="캐시 무시하고 강제 재질의")):
    """홈보드 API — 절대 500 에러를 반환하지 않습니다. ?force=true로 강제 새로고침 가능."""
    try:
        result = await query_notebook(HOME_QUERY, cache_key=CACHE_KEY, force=force)
        answer_text = result.get("answer", "데이터 없음")

        if not result.get("success"):
            fallback = dict(FALLBACK_DATA)
            fallback["raw"] = answer_text
            return fallback

        parsed = _parse_json_from_answer(answer_text)
        if parsed:
            # 필수 필드 보장
            parsed.setdefault("summary", "")
            parsed.setdefault("key_issues", [])
            parsed.setdefault("kpi_snapshot", {})
            parsed.setdefault("risk_count", {"high": 0, "medium": 0, "low": 0})
            # urgency 값 정규화
            for issue in parsed.get("key_issues", []):
                if issue.get("urgency") not in ("high", "medium", "low"):
                    issue["urgency"] = "medium"
            parsed["success"] = True
            return parsed

        # JSON 파싱 실패 시 원문을 summary로 반환
        return {
            "success": True,
            "summary": answer_text[:300] if answer_text else "데이터 없음",
            "key_issues": [],
            "kpi_snapshot": {},
            "risk_count": {"high": 0, "medium": 0, "low": 0},
            "raw": answer_text
        }

    except Exception as e:
        print(f"[HOME] API 오류: {traceback.format_exc()}")
        fallback = dict(FALLBACK_DATA)
        fallback["error_detail"] = str(e)
        return fallback

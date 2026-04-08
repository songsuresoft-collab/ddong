from services.mcp_client import query_notebook, register_preload_query
from fastapi import APIRouter
import json, re

router = APIRouter()
CACHE_KEY = "resources"

RESOURCES_QUERY = """
당신은 최고의 프로젝트 관리자(PMO)이자 데이터 분석가입니다.
M/M 데이터와 인원정보 시트를 바탕으로 현재 부서 리소스 상황을 입체적으로 분석해 주세요.
단순 숫자의 나열보다는 "왜 이런 수치가 나왔는지(Why?)" 실질적인 원인 파악에 초점을 맞춰야 합니다.

아래 JSON 형식으로만 응답해줘. JSON 외 다른 텍스트는 포함하지 마.

{
  "team_loads": [
    {"team": "팀명", "total_mm": 총공수숫자, "available_mm": 가용공수숫자, "load_rate": 부하율숫자, "status": "과부하/정상/여유", "hire_needed": 채용필요인원}
  ],
  "total_headcount": {"regular": 정규직수, "intern": 인턴수, "total": 합계},
  "reallocation_ideas": ["아이디어1", "아이디어2"],
  "ai_insight": "종합 인력 운용 평가 (100자 이내)",
  "overAllocation": {
    "teams": ["과부하팀리스트"],
    "analysis": "과부하 원인 심층 분석 (2~3문장)"
  },
  "idleResource": {
    "teams": ["여유팀리스트"],
    "analysis": "여유 리소스 분석 및 재배치 제안 (2~3문장)"
  },
  "stats": {
    "total_rate": 전사평균부하율,
    "short_teams": ["보충필요팀"],
    "free_teams": ["지원가능팀"],
    "insight": "AI-WBS-Manager 스타일의 전문적인 인력 운영 브리핑 요약 (2-3문장)"
  }
}
"""

# 프리로딩 등록
register_preload_query(CACHE_KEY, RESOURCES_QUERY)

def _parse_json_from_answer(answer: str) -> dict:
    answer = re.sub(r"```json\s*", "", answer)
    answer = re.sub(r"```\s*", "", answer)
    match = re.search(r"\{[\s\S]+\}", answer)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}

@router.get("/resources")
async def get_resources(force: bool = False):
    result = await query_notebook(RESOURCES_QUERY, cache_key=CACHE_KEY, force=force)
    answer_text = result.get("answer", "데이터 없음")
    if not result.get("success"):
        return {"success": False, "team_loads": [], "total_headcount": {}, "reallocation_ideas": [], "ai_insight": answer_text}
    parsed = _parse_json_from_answer(answer_text)
    if parsed:
        parsed["success"] = True
        return parsed
    return {"success": True, "team_loads": [], "total_headcount": {}, "reallocation_ideas": [], "ai_insight": answer_text, "raw": answer_text}

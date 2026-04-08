from services.mcp_client import query_notebook, register_preload_query
from fastapi import APIRouter
import json, re

router = APIRouter()
CACHE_KEY = "projects_v2"

PROJECTS_QUERY = """
당신은 최고의 프로젝트 관리자(PMO)이자 데이터 분석가입니다.
전체 프로젝트 데이터(예: 2026_PJT 시트 등)를 꼼꼼히 스캔하여, 상태값이 "6.진행중"으로 표기된 **모든 프로젝트를 단 한 건도 빠짐없이** 추출해 주세요.
*절대 임의로 요약하거나 5개까지만 끊어서 출력하지 마십시오.*
"6.진행중" 프로젝트가 약 16건 내외라면, 반드시 응답의 'projects' 배열에 동일한 개수가 리스트업되어야 합니다.

구체적인 지연 사유를 semantic하게 추출하고 리스크 등급별로 과제를 상세히 분류해 주세요.
리스크가 높은("high") 과제는 지연 원인 파악에 초점을 맞춰 기록해 주십시오.

아래 JSON 형식으로만 응답해줘. JSON 외 다른 텍스트는 포함하지 마.

{
  "projects": [
    {"name": "과제명", "pm": "담당자명", "team": "팀명", "client": "고객사", "risk_level": "high/medium/low", "delay_reason": "지연 사유 (없으면 null)", "progress": 85.5, "status": "상태명", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}
  ],
  "risk_summary": {"high": 숫자, "medium": 숫자, "low": 숫자},
  "ai_insight": "전체 리스크 평가 및 권고사항 (100자 이내)",
  "overBudget": {
    "count": 계약M/M 한도를 초과한 과제의 총 개수,
    "analysis": "계약 예산 대비 실투입 초과 분석 (2~3문장)"
  },
  "pmBottleneck": {
    "topPm": "가장 많은 과제를 담당하는 PM",
    "analysis": "PM 업무 과부하 분석 (2~3문장)"
  },
  "stats": {
    "total_projects": 전체프로젝트수,
    "delayed_projects": 지연중인프로젝트수,
    "kpi_projects": 이번달종료예정인프로젝트수,
    "health": { "normal": 정상수(progress>=90), "caution": 주의수(risk=medium), "danger": 위험수(risk=high) }
  }
}
"""

# 프리로딩 등록
register_preload_query(CACHE_KEY, PROJECTS_QUERY)

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

@router.get("/projects")
async def get_projects(force: bool = False):
    result = await query_notebook(PROJECTS_QUERY, cache_key=CACHE_KEY, force=force)
    answer_text = result.get("answer", "데이터 없음")
    if not result.get("success"):
        return {"success": False, "projects": [], "risk_summary": {"high": 0, "medium": 0, "low": 0}, "ai_insight": answer_text}
    parsed = _parse_json_from_answer(answer_text)
    if parsed:
        parsed["success"] = True
        return parsed
    return {"success": True, "projects": [], "risk_summary": {"high": 0, "medium": 0, "low": 0}, "ai_insight": answer_text, "raw": answer_text}

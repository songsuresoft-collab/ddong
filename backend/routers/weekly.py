from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import re
import datetime
import hashlib
from services.mcp_client import query_notebook, register_preload_query, get_cached, set_cache
from utils.excel_export import export_dict_to_excel

router = APIRouter()
CACHE_KEY = "weekly_generate"

# ── STEP 1: 시트 목록 조회 쿼리 ──
SHEET_LIST_QUERY = """
소스 파일(엑셀/스프레드시트)에 포함된 시트(탭) 이름을 모두 나열하십시오.

[중요 필터 규칙]
- 반드시 '년도 + 월 + 주차' 형식이 모두 포함된 시트명만 출력하십시오.
  예시 형식: '26년 1월 2주', '25년 12월 5주', '26년 3월 1주'
- 년도가 없는 시트명(예: '1월 2주', '12월 5주')은 오래된 시트이므로 완전히 무시하고 목록에서 제외하십시오.
- 시트명 외의 다른 텍스트는 출력하지 마십시오.

[출력 형식]
아래 JSON 형식으로만 출력하십시오:
{
  "sheets": ["시트명1", "시트명2", "시트명3"],
  "latest_sheet": "목록 중 가장 최신 주차 시트명 (년도 기준 정렬 후 가장 최신)"
}
"""

# 프리로딩 등록 (Step1 - API와 동일한 키 사용)
register_preload_query("weekly_sheet_list_v1", SHEET_LIST_QUERY)

# 빈 대시보드 폴백 구조
def _empty_dashboard(latest_sheet: str = "알 수 없음", reason: str = "") -> dict:
    return {
        "success": False,
        "last_updated": latest_sheet,
        "overall_summary": reason or "데이터를 불러오지 못했습니다. 잠시 후 새로고침을 시도해 주세요.",
        "stats": [
            {"name": "순조로움", "value": 0},
            {"name": "병목 발생", "value": 0},
            {"name": "지연 위험", "value": 0},
        ],
        "teams": {
            "SDV솔루션 1팀": [],
            "SDV솔루션 2팀": [],
            "SDV솔루션 3팀": [],
            "SDV솔루션 4팀": [],
        },
        "recent_week_details": {
            "week": latest_sheet,
            "highlights": [],
            "risks": [],
            "team_spotlights": {
                "SDV솔루션 1팀": "",
                "SDV솔루션 2팀": "",
                "SDV솔루션 3팀": "",
                "SDV솔루션 4팀": "",
            }
        }
    }


class WeeklyReportGenerationRequest(BaseModel):
    session_id: str
    progress_text: str
    notebook_id: Optional[str] = None


class ExportRequest(BaseModel):
    session_id: str
    document_type: str
    data: Dict[str, Any]


def _parse_json_from_answer(answer: str) -> dict:
    """Recursive JSON parser."""
    if not isinstance(answer, str) or not answer.strip():
        return {} if not isinstance(answer, dict) else answer
    answer = re.sub(r"```json\s*", "", answer)
    answer = re.sub(r"```\s*", "", answer)
    match = re.search(r"\{[\s\S]+\}", answer)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, dict) and "answer" in data and isinstance(data["answer"], str):
                nested = _parse_json_from_answer(data["answer"])
                if nested:
                    return nested
            return data
        except json.JSONDecodeError:
            pass
    return {}


def _data_hash(data: dict) -> str:
    try:
        return hashlib.md5(json.dumps(data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    except Exception:
        return ""


@router.post("/weekly-progress/generate")
async def generate_report(request: WeeklyReportGenerationRequest):
    """보고서 자동 생성 - 실패 시 500 대신 success:False 반환."""
    query = f"""
System Instruction: You are a professional AI work assistant. Generate a weekly progress report based on the user's progress summary and historical context from NotebookLM.
DO NOT provide any text outside the JSON structure.
Format the output EXACTLY as this JSON structure:
{{
  "title": "주간 진도 보고서",
  "missing_info": ["누락되거나 불분명한 정보 1", "누락되거나 불분명한 정보 2"],
  "highlighted_issues": ["주요 이슈/위험 1", "주요 이슈/위험 2"],
  "report_draft": "마크다운 형식의 보고서 텍스트"
}}

User Progress Summary:
{request.progress_text}
"""
    try:
        result = await query_notebook(query=query, cache_key=CACHE_KEY, force=True)
    except Exception as e:
        import traceback
        print(f"[WEEKLY GENERATE] 예외: {traceback.format_exc()}")
        return {
            "success": False,
            "intent_detected": "weekly_report_generation",
            "error": str(e),
            "structured_data": {
                "title": "보고서 생성 실패",
                "missing_info": [],
                "highlighted_issues": [],
                "report_draft": f"AI 서비스 오류: {str(e)}"
            },
            "reference_documents": []
        }

    answer_text = result.get("answer", "")
    if not result.get("success"):
        return {
            "success": False,
            "intent_detected": "weekly_report_generation",
            "error": answer_text,
            "structured_data": {
                "title": "보고서 생성 실패",
                "missing_info": [],
                "highlighted_issues": [],
                "report_draft": answer_text
            },
            "reference_documents": []
        }

    structured_data = _parse_json_from_answer(answer_text)
    if not structured_data:
        structured_data = {
            "title": "주간 진도 보고서",
            "missing_info": [],
            "highlighted_issues": [],
            "report_draft": answer_text
        }

    return {
        "success": True,
        "intent_detected": "weekly_report_generation",
        "structured_data": structured_data,
        "reference_documents": []
    }


@router.get("/weekly-progress/dashboard")
async def get_weekly_dashboard(force: bool = False):
    """
    주간진도 대시보드 - 2-Step MCP 질의
    - 모든 실패 경로에서 HTTPException 대신 success:False JSON 반환
    - force 갱신 시 데이터 변동 감지 후 캐시 파일만 선택적 갱신
    """
    step1_cache_key = "weekly_sheet_list_v1"
    print(f"[WEEKLY] Step1 시작 (force={force})")

    # ── STEP 1: 시트 목록 조회 ──
    try:
        step1_result = await query_notebook(
            query=SHEET_LIST_QUERY,
            cache_key=step1_cache_key,
            force=force,
        )
    except Exception as e:
        import traceback
        print(f"[WEEKLY STEP1] 예외: {traceback.format_exc()}")
        # 기존 대시보드 캐시가 있으면 반환
        for key_prefix in ["weekly_dashboard_v4_"]:
            for k in list(get_cached.__globals__.get("_cache", {}).keys()):
                if k.startswith(key_prefix):
                    cached = get_cached(k)
                    if cached:
                        cached["_from_cache"] = True
                        cached["_warning"] = f"시트 조회 실패, 캐시 반환: {str(e)[:60]}"
                        return cached
        return _empty_dashboard(reason=f"시트 목록 조회 실패: {str(e)}")

    if not step1_result.get("success"):
        err_msg = step1_result.get("answer", "알 수 없는 오류")
        print(f"[WEEKLY STEP1] MCP 오류: {err_msg[:100]}")
        return _empty_dashboard(reason=f"MCP 오류 (Step1): {err_msg[:120]}")

    # 시트명 추출
    step1_data = _parse_json_from_answer(step1_result.get("answer", ""))
    latest_sheet = step1_data.get("latest_sheet", "")

    # 파싱 실패 시 regex 폴백
    if not latest_sheet:
        raw = step1_result.get("answer", "")
        matches = re.findall(r"\d{2}년\s*\d{1,2}월\s*\d{1,2}주", raw)
        if matches:
            latest_sheet = matches[-1]
            print(f"[WEEKLY] regex 폴백 시트: {latest_sheet}")
        else:
            print(f"[WEEKLY STEP1] 시트명 추출 실패, 캐시 폴백 시도")
            # 가장 최근 weekly 캐시 반환
            from services.mcp_client import _cache
            for k in sorted(_cache.keys(), reverse=True):
                if k.startswith("weekly_dashboard_v4_"):
                    cached = get_cached(k)
                    if cached and isinstance(cached, dict):
                        cached["_from_cache"] = True
                        cached["_warning"] = "시트명 파악 실패 — 마지막 캐시 반환"
                        return cached
            return _empty_dashboard(reason=f"최신 시트를 확인할 수 없습니다. Step1 응답 일부: {raw[:200]}")

    print(f"[WEEKLY] 분석 대상 시트: '{latest_sheet}'")

    # ── STEP 2: 주간진도 상세 분석 ──
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    step2_cache_key = f"weekly_dashboard_v4_{latest_sheet.replace(' ', '_')}"

    # force 시 기존 해시 저장
    old_hash = ""
    if force:
        existing = get_cached(step2_cache_key)
        if existing:
            old_hash = _data_hash(existing)

    step2_query = f"""
System Instruction: 당신은 SDV시스템실 주간 진도 대시보드 데이터를 생성하는 AI입니다. (요청 시각: {now_str})

[★ 중요: 팀명 매칭 유연화 규칙]
- 소스 데이터의 팀명이 아래와 같이 다양하게 표기될 수 있습니다. 이를 각 팀 카테고리에 정확히 할당하십시오.
  1. 'SDV솔루션 1팀', 'SDV솔루션1팀(SS1)', '솔루션 1팀', '1팀', 'SS1' -> "SDV솔루션 1팀"으로 분류
  2. 'SDV솔루션 2팀', 'SDV솔루션2팀(SS2)', '솔루션 2팀', '2팀', 'SS2' -> "SDV솔루션 2팀"으로 분류
  3. 'SDV솔루션 3팀', 'SDV솔루션3팀(SS3)', '솔루션 3팀', '3팀', 'SS3' -> "SDV솔루션 3팀"으로 분류
  4. 'SDV솔루션 4팀', 'SDV솔루션4팀(SS4)', '솔루션 4팀', '4팀', 'SS4' -> "SDV솔루션 4팀"으로 분류

[★ 분석 범위 확정 — 반드시 준수]
- 오직 '{latest_sheet}' 시트의 내용만을 사용하십시오.
- '{latest_sheet}' 시트에 명시적으로 기재되지 않은 정보는 null로 처리하되, 의미가 통하는 데이터가 있다면 최대한 추출하십시오.

[분류 및 추출 기준]
1. 프로젝트: 각 팀 섹션 하위의 모든 프로젝트 명칭 추출.
2. 상태 판별: 
   - '순조로움': 정상 진행, 완료, 100% 달성 등
   - '병목 발생': 일부 지연, 협의 중, 수집 중, 도구 이슈, 사유 기재 있음 등
   - '지연 위험': 형상 수령 대기(2주 이상), 긴급 장애, 일정 지연 명시 등
3. 한줄평(ai_comment): 해당 프로젝트의 '금주 수행 내용'을 기반으로 30자 이내의 전문가 피드백 작성.

출력 JSON (JSON 외의 텍스트 절대 금지):
{{
  "last_updated": "{latest_sheet}",
  "overall_summary": "전체 조직의 이번 주 주요 성과와 리스크를 부서장 관점에서 3줄 이내로 요약",
  "stats": [
    {{ "name": "순조로움", "value": 숫자 }},
    {{ "name": "병목 발생", "value": 숫자 }},
    {{ "name": "지연 위험", "value": 숫자 }}
  ],
  "teams": {{
    "SDV솔루션 1팀": [
      {{
        "project": "프로젝트명",
        "status": "순조로움",
        "progress": null,
        "assignee": "담당자명",
        "this_week": "금주 수행 내용 (없으면 null)",
        "next_week": "차주 수행 계획 (없으면 null)",
        "ai_comment": "AI 한줄평 (30자 이내, 없으면 null)",
        "bottleneck": "병목 사유 (없으면 null)"
      }}
    ],
    "SDV솔루션 2팀": [],
    "SDV솔루션 3팀": [],
    "SDV솔루션 4팀": []
  }},
  "recent_week_details": {{
    "week": "{latest_sheet}",
    "highlights": ["성과 1", "성과 2", "성과 3"],
    "risks": ["리스크 1", "리스크 2"],
    "team_spotlights": {{
      "SDV솔루션 1팀": "팀 핵심 한 줄 요약",
      "SDV솔루션 2팀": "팀 핵심 한 줄 요약",
      "SDV솔루션 3팀": "팀 핵심 한 줄 요약",
      "SDV솔루션 4팀": "팀 핵심 한 줄 요약"
    }}
  }}
}}
"""

    try:
        step2_result = await query_notebook(
            query=step2_query,
            cache_key=step2_cache_key,
            force=force,
        )
    except Exception as e:
        import traceback
        print(f"[WEEKLY STEP2] 예외: {traceback.format_exc()}")
        # 이전 캐시 반환
        cached = get_cached(step2_cache_key)
        if cached and isinstance(cached, dict):
            cached["_from_cache"] = True
            cached["_warning"] = f"갱신 실패, 캐시 반환: {str(e)[:80]}"
            return cached
        return _empty_dashboard(latest_sheet, reason=f"데이터 분석 실패: {str(e)}")

    if not step2_result.get("success"):
        err_msg = step2_result.get("answer", "알 수 없는 오류")
        print(f"[WEEKLY STEP2] MCP 오류: {err_msg[:100]}")
        # 이전 캐시 반환
        cached = get_cached(step2_cache_key)
        if cached and isinstance(cached, dict):
            cached["_from_cache"] = True
            cached["_warning"] = f"MCP 오류, 캐시 반환: {err_msg[:80]}"
            return cached
        return _empty_dashboard(latest_sheet, reason=f"MCP 오류 (Step2): {err_msg[:120]}")

    # JSON 파싱
    answer_text = step2_result.get("answer", "")
    structured_data = _parse_json_from_answer(answer_text)

    if not structured_data:
        # 파싱 실패 → 이전 캐시 반환
        cached = get_cached(step2_cache_key)
        if cached and isinstance(cached, dict):
            cached["_from_cache"] = True
            cached["_warning"] = "JSON 파싱 실패, 캐시 반환"
            return cached
        return _empty_dashboard(latest_sheet, reason="AI 응답 파싱 실패")

    structured_data["success"] = True

    # ── 데이터 변동 감지 → 선택적 캐시 갱신 ──
    if force and old_hash:
        new_hash = _data_hash(structured_data)
        if new_hash != old_hash:
            print(f"[WEEKLY] 데이터 변동 감지 — 캐시 갱신: {step2_cache_key}")
            set_cache(step2_cache_key, {"answer": json.dumps(structured_data, ensure_ascii=False), "success": True})
            structured_data["_data_changed"] = True
        else:
            print(f"[WEEKLY] 데이터 변동 없음 — 캐시 유지: {step2_cache_key}")
            structured_data["_data_changed"] = False

    return structured_data


@router.post("/weekly-progress/export")
async def export_report(request: ExportRequest):
    from fastapi import HTTPException
    if request.document_type != "report":
        raise HTTPException(status_code=400, detail="Invalid document type")
    return export_dict_to_excel(request.data, sheet_title="Weekly Report")

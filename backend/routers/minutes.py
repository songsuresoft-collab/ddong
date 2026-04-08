from services.mcp_client import query_notebook, register_preload_query, get_cached, set_cache
from fastapi import APIRouter
from typing import Optional
import json, re, hashlib
from datetime import datetime

router = APIRouter()
CACHE_KEY = "minutes"

# 프리로딩 등록 (API와 동일한 캐시 키 사용)
register_preload_query("minutes", "System Instruction: 당신은 SDV시스템실의 회의록 및 액션 아이템 데이터를 추출하는 전문 분석가입니다.")


def _parse_json_from_answer(answer: str) -> dict:
    """Recursive JSON parser to handle double-encoded AI responses."""
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
    """데이터의 해시를 계산하여 변동 여부 감지에 사용."""
    try:
        serialized = json.dumps(data, ensure_ascii=False, sort_keys=True)
        return hashlib.md5(serialized.encode()).hexdigest()
    except Exception:
        return ""


def _post_process_action_items(parsed: dict) -> dict:
    """Action Item 기한 초과 자동 완료 후처리."""
    today = datetime.now().date()
    action_items = parsed.get("open_action_items", [])
    updated_items = []

    for item in action_items:
        due_str = item.get("due", "TBD")
        status = item.get("status", "미완료")
        try:
            if due_str and due_str != "TBD":
                clean_due = re.sub(r"[^\d-]", "-", due_str.replace(".", "-"))
                if clean_due.count("-") == 2:
                    if len(clean_due.split("-")[0]) == 2:
                        clean_due = "20" + clean_due
                    due_date = datetime.strptime(clean_due, "%Y-%m-%d").date()
                    if due_date < today and status != "완료":
                        item["status"] = "완료"
                        item["item"] = f"[자동완료] {item['item']}"
        except Exception as e:
            print(f"[post-process] Date parsing failed for {due_str}: {e}")
        updated_items.append(item)

    parsed["open_action_items"] = updated_items
    parsed["total_open_items"] = len([i for i in updated_items if i.get("status") != "완료"])
    return parsed


@router.get("/minutes")
async def get_minutes(force: bool = False):
    """
    회의록 API - 단일 MCP 질의로 최적화
    - force=True: 캐시 무효화 후 MCP 재질의
    - 실패 시 HTTPException 대신 success:False 응답 반환 (500 에러 방지)
    - 데이터 변동 감지 시에만 캐시 파일 갱신
    """
    prompt_scope = "'회의록' 시트에 기록된 내용 (시트가 없다면 가장 최신 '주간보고' 시트)의 모든 회의 내용"
    cache_key = "minutes"
    
    query = f"""
System Instruction: 당신은 SDV시스템실의 회의록 및 액션 아이템 데이터를 추출하는 전문 분석가입니다.

[분석 범위]
- {prompt_scope}을(를) 정밀 분석하십시오.
- 각 행(Row)은 하나의 회의를 나타냅니다. 날짜, 제목(프로젝트명), 참석자, 내용, Action Item(대응 이슈 및 향후 일정)을 정확히 추출하십시오.

[출력 규칙]
1. 모든 회의에 대해 날짜 역순(최신순)으로 정렬하여 리스트를 만드십시오.
2. 각 회의별로 핵심 내용을 AI가 3줄로 요약하십시오.
3. '대응 이슈 및 향후 일정' 컬럼에서 담당자가 명시된 구체적인 할 일(Action Item)을 모두 추출하십시오.
4. Action Item의 기한(due)은 'YYYY-MM-DD' 형식으로 변환하십시오. 연도가 없으면 2025년 또는 2026년 정황에 맞춰 보정하십시오.
5. 아래 JSON 형식으로만 응답하십시오.

{{
  "meetings": [
    {{
      "date": "YYYY-MM-DD",
      "title": "회의명(프로젝트명)",
      "participants": "참석자",
      "summary": ["1줄 요약", "2줄 요약", "3줄 요약"],
      "raw": "원본 내용 요약"
    }}
  ],
  "open_action_items": [
    {{
      "item": "액션 아이템 내용",
      "owner": "담당자",
      "due": "YYYY-MM-DD",
      "status": "미완료"
    }}
  ],
  "total_open_items": 숫자
}}
"""

    old_hash = ""
    if force:
        existing = get_cached(cache_key) or get_cached("minutes_full_history_v2")
        if existing:
            old_hash = _data_hash(existing)

    print(f"[MINUTES] 분석 시작 (cache_key={cache_key}, force={force})")

    try:
        result = await query_notebook(
            query=query,
            cache_key=cache_key,
            force=force,
        )
    except Exception as e:
        import traceback
        print(f"[MINUTES] 예외 발생: {traceback.format_exc()}")
        fallback = get_cached(cache_key) or get_cached("minutes_full_history_v2")
        if fallback and isinstance(fallback, dict) and fallback.get("meetings"):
            fallback["_from_cache"] = True
            fallback["_warning"] = f"MCP 예외, 캐시 반환: {str(e)[:80]}"
            return fallback
        return {
            "success": False,
            "meetings": [],
            "open_action_items": [],
            "total_open_items": 0,
            "error": f"회의록 분석 실패: {str(e)}",
            "_from_cache": False,
        }

    if not result.get("success"):
        err_msg = result.get("answer", "알 수 없는 오류")
        print(f"[MINUTES] MCP 오류: {err_msg[:100]}")
        fallback = get_cached(cache_key) or get_cached("minutes_full_history_v2")
        if fallback and isinstance(fallback, dict) and fallback.get("meetings"):
            fallback["_from_cache"] = True
            fallback["_warning"] = f"MCP 오류, 캐시 반환: {err_msg[:80]}"
            return fallback
        return {
            "success": False,
            "meetings": [],
            "open_action_items": [],
            "total_open_items": 0,
            "error": err_msg,
            "_from_cache": False,
        }

    # JSON 파싱
    answer_text = result.get("answer", "")
    parsed = _parse_json_from_answer(answer_text)

    if not parsed:
        fallback = get_cached(cache_key) or get_cached("minutes_full_history_v2")
        if fallback and isinstance(fallback, dict) and fallback.get("meetings"):
            fallback["_from_cache"] = True
            fallback["_warning"] = "JSON 파싱 실패, 캐시 반환"
            return fallback
        return {
            "success": True,
            "meetings": [],
            "open_action_items": [],
            "total_open_items": 0,
            "raw": answer_text,
            "_from_cache": False,
        }

    # ── Action Item 후처리 ──
    parsed = _post_process_action_items(parsed)
    parsed["success"] = True

    # ── 데이터 변동 감지 → 선택적 캐시 갱신 ──
    if force and old_hash:
        new_hash = _data_hash(parsed)
        if new_hash != old_hash:
            print(f"[MINUTES] 데이터 변동 감지 — 캐시 파일 갱신: {cache_key}")
            set_cache(cache_key, {"answer": json.dumps(parsed, ensure_ascii=False), "success": True})
            parsed["_data_changed"] = True
        else:
            print(f"[MINUTES] 데이터 변동 없음 — 캐시 유지: {cache_key}")
            parsed["_data_changed"] = False

    return parsed

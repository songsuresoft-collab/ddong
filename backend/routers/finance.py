"""
Finance 라우터 — NotebookLM MCP 연동 (원본 Antigravity Dashboard server.js 방식)
- 완전 구조화 JSON 스키마 질의 (h1, annual, monthlyRevenue, projects, trend, feed, contracts)
- 소스 동기화 먼저 실행 후 질의 (구글 드라이브 문서 갱신)
- safeParseJSON 방어 처리
- 강제 새로고침: ?force=true
"""
from services.mcp_client import query_notebook, register_preload_query
from fastapi import APIRouter, Query
import json, re

router = APIRouter()
CACHE_KEY = "finance"

# ── 원본 server.js와 동일한 완전 구조화 스키마 쿼리 ──────────────────────────
FINANCE_QUERY = """
너는 SDV시스템실의 수주/매출 데이터 분석 AI다. 역할: Strategic Intelligence AI.
노트북 소스를 분석해서 아래 JSON 형식으로만 응답해라.
절대로 마크다운 설명글이나 ```json 코드블록 없이 순수 JSON만 출력할 것.

[데이터 추출 규칙]
1. "2026년 예상 수주/매출액" 키워드 하단 테이블 참조:
   - h1.order: 상반기 수주 목표/실적 (SS1~SS4 합계)
   - h1.revenue: 상반기 매출 목표/실적/예상(확률반영)
   - annual.order: 연간 수주 목표/실적/예상(확률반영)
   - annual.revenue: 연간 매출 목표/실적/예상(확률반영)
2. "2026_PJT" 섹션: 모든 프로젝트 행을 빠짐없이 추출
3. "매출관리" 시트: 팀별(SS1~SS4) 1~12월 월별 실적/예상 매출 데이터
4. status 판별: 달성률 80%+ = normal, 60~79% = warning, 60%미만 = critical
5. 숫자는 단위(백만원/억) 제거하고 순수 숫자(억원 단위)로
6. #REF! 또는 빈 값은 0으로 처리

{
  "h1": {
    "order": {
      "kpi": {
        "Total": { "target": 0, "actual": 0, "expected": 0, "remaining": 0 },
        "SS1": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS2": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS3": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS4": { "target": 0, "actual": 0, "expected": 0, "status": "normal" }
      }
    },
    "revenue": {
      "kpi": {
        "Total": { "target": 0, "actual": 0, "expected": 0, "remaining": 0 },
        "SS1": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS2": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS3": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS4": { "target": 0, "actual": 0, "expected": 0, "status": "normal" }
      }
    }
  },
  "annual": {
    "order": {
      "kpi": {
        "Total": { "target": 0, "actual": 0, "expected": 0, "remaining": 0 },
        "SS1": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS2": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS3": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS4": { "target": 0, "actual": 0, "expected": 0, "status": "normal" }
      }
    },
    "revenue": {
      "kpi": {
        "Total": { "target": 0, "actual": 0, "expected": 0, "remaining": 0 },
        "SS1": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS2": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS3": { "target": 0, "actual": 0, "expected": 0, "status": "normal" },
        "SS4": { "target": 0, "actual": 0, "expected": 0, "status": "normal" }
      }
    }
  },
  "monthlyRevenue": {
    "labels": ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
    "actual": {
      "SS1": [0,0,0,0,0,0,0,0,0,0,0,0],
      "SS2": [0,0,0,0,0,0,0,0,0,0,0,0],
      "SS3": [0,0,0,0,0,0,0,0,0,0,0,0],
      "SS4": [0,0,0,0,0,0,0,0,0,0,0,0]
    },
    "expected": {
      "SS1": [0,0,0,0,0,0,0,0,0,0,0,0],
      "SS2": [0,0,0,0,0,0,0,0,0,0,0,0],
      "SS3": [0,0,0,0,0,0,0,0,0,0,0,0],
      "SS4": [0,0,0,0,0,0,0,0,0,0,0,0]
    }
  },
  "projects": [
    { "id": 1, "code": "코드", "name": "프로젝트명", "status": 6, "pm": "이름", "team": "SS1", "workers": ["담당자"], "mm": 0, "contractAmt": "0억", "startDate": "2026-01-01", "endDate": "2026-12-31" }
  ],
  "trend": {
    "labels": ["2023","2024","2025","2026(E)"],
    "orderBar": [0, 0, 0, 0],
    "revenueLine": [0, 0, 0, 0]
  },
  "feed": [
    { "type": "critical", "title": "리스크 제목", "desc": "리스크 내용" },
    { "type": "cyan", "title": "제안 제목", "desc": "제안 내용" }
  ],
  "contracts": [
    { "year": 2024, "amount": "금액", "mm": 0, "headcount": 0, "projects": 0, "tools": { "MATLAB": 0, "STATIC": 0 } }
  ],
  "ai_insight": "종합 재무 평가 및 부서장 액션 아이템 (200자 이내)"
}
"""

# 프리로딩 등록
register_preload_query(CACHE_KEY, FINANCE_QUERY)


def _safe_parse_json(text: str) -> dict | None:
    """원본 server.js safeParseJSON과 동일한 방어 처리"""
    if not text:
        return None

    # 마크다운 코드블록 제거: ```json ... ```
    code_block = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    json_str = code_block.group(1) if code_block else text

    # 첫 { 에서 마지막 } 사이만 추출
    first = json_str.find('{')
    last  = json_str.rfind('}')
    if first == -1 or last == -1:
        return None
    json_str = json_str[first:last + 1]

    # AI가 빈 배열 값을 남긴 경우 방어 처리: "key": , → "key": null,
    json_str = re.sub(r':\s*,', ': null,', json_str)
    json_str = re.sub(r':\s*\n(\s*[}\]])', r': null\n\1', json_str)

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"[Finance] JSON parse failed: {e} | preview: {json_str[:300]}")
        return None


def _sanitize_dashboard(data: dict) -> dict:
    """원본 App.jsx sanitizeDashboard()와 동일한 배열/구조 방어 처리"""
    if not data:
        return {}

    arr12 = [0] * 12

    # monthlyRevenue
    if 'monthlyRevenue' in data:
        mr = data['monthlyRevenue']
        for sub in ('actual', 'expected'):
            if sub not in mr or not isinstance(mr[sub], dict):
                mr[sub] = {}
            for t in ('SS1', 'SS2', 'SS3', 'SS4'):
                if not isinstance(mr[sub].get(t), list):
                    mr[sub][t] = list(arr12)
        # 레거시 플랫 배열 호환
        for t in ('SS1', 'SS2', 'SS3', 'SS4'):
            if not isinstance(mr.get(t), list):
                mr[t] = mr.get('actual', {}).get(t, list(arr12))

    # trend
    if 'trend' in data:
        tr = data['trend']
        for k in ('orderBar', 'revenueLine'):
            if not isinstance(tr.get(k), list):
                tr[k] = [0, 0, 0, 0]

    # h1 / annual KPI
    for period in ('h1', 'annual'):
        if period not in data:
            data[period] = {}
        for typ in ('order', 'revenue'):
            if typ not in data[period]:
                data[period][typ] = {'kpi': {'Total': {'target': 0, 'actual': 0, 'expected': 0, 'remaining': 0}}}

    # lists
    for k in ('projects', 'feed', 'contracts'):
        if not isinstance(data.get(k), list):
            data[k] = []

    # contracts.amount를 문자열로
    data['contracts'] = [
        {**c, 'amount': f"{c['amount']}억" if isinstance(c.get('amount'), (int, float)) else c.get('amount', '0억')}
        for c in data['contracts']
    ]

    return data


@router.get("/finance")
async def get_finance(force: bool = Query(False)):
    """
    NotebookLM MCP에서 수주/매출 대시보드 전체 데이터를 가져옵니다.
    - 캐시 히트 시 즉시 반환 (기본)
    - ?force=true: 소스 동기화 후 MCP 재질의 (SYNC 버튼용)
    """
    result = await query_notebook(FINANCE_QUERY, cache_key=CACHE_KEY, force=force)
    answer_text = result.get("answer", "")

    if not result.get("success"):
        return {
            "success": False,
            "error": answer_text,
            "h1": {}, "annual": {}, "monthlyRevenue": {},
            "projects": [], "feed": [], "contracts": [], "trend": {},
            "ai_insight": "데이터 없음"
        }

    # 1차: answer_text 직접 파싱
    parsed = _safe_parse_json(answer_text)

    # 2차: MCP 래퍼 {answer: "..."} 형식 언래핑 후 재파싱
    if not parsed:
        try:
            wrapper = json.loads(answer_text)
            if isinstance(wrapper, dict) and "answer" in wrapper:
                parsed = _safe_parse_json(wrapper["answer"])
        except Exception:
            pass

    if not parsed:
        print(f"[Finance] JSON parse failed entirely. Raw preview: {answer_text[:400]}")
        return {
            "success": True,
            "h1": {}, "annual": {}, "monthlyRevenue": {},
            "projects": [], "feed": [], "contracts": [], "trend": {},
            "ai_insight": answer_text[:500],
            "raw": answer_text[:1000],
            "_from_cache": result.get("_from_cache", False),
        }

    clean = _sanitize_dashboard(parsed)
    clean["success"] = True
    clean["_from_cache"] = result.get("_from_cache", False)
    return clean

"""
MCP 질의 결과를 디스크 캐시로 시딩하는 스크립트.
Antigravity에서 직접 질의한 결과를 백엔드 캐시 형식으로 저장합니다.
"""
import json
import time
import hashlib
from pathlib import Path

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

def _cache_file_path(key: str) -> Path:
    safe = hashlib.md5(key.encode()).hexdigest()[:16]
    prefix = "".join(c if c.isalnum() else "_" for c in key[:30])
    return CACHE_DIR / f"{prefix}__{safe}.json"


def save_cache(key: str, answer: str):
    data = {"answer": answer, "success": True}
    ts = time.time()
    cache_entry = {"key": key, "data": data, "ts": ts}
    fpath = _cache_file_path(key)
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(cache_entry, f, ensure_ascii=False, indent=2)
    print(f"[SEED] Saved: {fpath.name} ({len(answer)} chars)")


# ── Finance ──
save_cache("finance", json.dumps({
  "teams": [
    {"name": "SS1", "order_target": 37.28, "order_actual": 14.95, "order_rate": 40.09, "sales_target": 33.02, "sales_actual": 12.09, "sales_rate": 36.60, "status": "미달", "action": "수주 파이프라인 신규 발굴 및 기존 프로젝트 매출 전환 가속화"},
    {"name": "SS2", "order_target": 23.94, "order_actual": 19.39, "order_rate": 80.99, "sales_target": 22.75, "sales_actual": 10.34, "sales_rate": 45.47, "status": "위험", "action": "기 수주된 프로젝트의 신속한 인력 투입 및 매출 조기 인식 추진"},
    {"name": "SS3", "order_target": 29.08, "order_actual": 15.77, "order_rate": 54.22, "sales_target": 23.85, "sales_actual": 2.65, "sales_rate": 11.12, "status": "미달", "action": "매출 달성률 최하위로, 지연 중인 과제 현황 점검 및 조기 착수 방안 마련 필수"},
    {"name": "SS4", "order_target": 11.60, "order_actual": 10.80, "order_rate": 93.12, "sales_target": 8.56, "sales_actual": 4.61, "sales_rate": 53.86, "status": "위험", "action": "수주는 목표 달성에 근접하므로, 집중적인 산출물 납품을 통한 단기 매출 확보 주력"}
  ],
  "total": {"order_target": 101.89, "order_actual": 60.90, "order_rate": 59.77, "sales_target": 88.17, "sales_actual": 29.69, "sales_rate": 33.68},
  "ai_insight": "전체 수주 달성률 59.7%, 매출 달성률 33.6%로 연간 목표 대비 부진합니다. 기 수주 과제의 신속한 인력 투입과 진행률 제고를 통해 매출 전환을 가속화하고, SS1 및 SS3팀의 신규 사업 기회 발굴이 시급합니다."
}, ensure_ascii=False))

# ── Weekly Progress ──
save_cache("weekly", json.dumps({
  "week": "2026년 2월 2주",
  "teams": [
    {"name": "SDV솔루션1팀(SS1)", "this_week": "VPC-S1.2 정적 검증 및 84S0 단위검증 완료, 85S0 단위/통합 검증 진행, M7 BSW 정적 검증 완료", "next_week": "VPC-S1.2 정적 검증, 85S0 단위 및 통합 검증 진행, T0020 요구사양서 작성", "progress": 100, "status": "순조로움", "ai_comment": "목표한 주요 검증 및 사양서 작성 업무가 계획대로 원활하게 진행되고 있습니다."},
    {"name": "SDV솔루션2팀(SS2)", "this_week": "중국향 EV/EREV 정기 펌웨어 정적/보안 룰 검증 완료 및 산출물 전달 예정, 앱디자인 컴파일 스킵 구현", "next_week": "중국향 EV/EREV 정적 검증 수행 지원 및 앱디자인 성능 개선 검토, 신규 형상 수령 대기", "progress": 80, "status": "순조로움", "ai_comment": "중국향 EV/EREV 검증을 성공적으로 마무리하였으며, 신규 형상을 대기 중입니다."},
    {"name": "SDV솔루션3팀(SS3)", "this_week": "VPC 1.1 통합 검증 완료, VPC 1.2/자율주행 기능안전 검증 진행 및 FIT 환경 세팅 완료", "next_week": "VPC 1.1/1.2 및 자율주행 기능안전 검증 지속, FIT 도구 오류 대응 및 피드백 반영", "progress": 85, "status": "지연 위험", "ai_comment": "자율주행 일정 재협의 및 FIT 도구 UI 오류 이슈가 존재하여 일정 모니터링이 필요합니다."},
    {"name": "SDV솔루션4팀(SS4)", "this_week": "2차 회귀 검증 산출물 전달 및 VCU 제어기 회귀 검증 완료, 3차 회귀 검증 변경점 분석", "next_week": "VPC-S 1.1 제어기 대상 2차 회귀 검증 수행", "progress": 100, "status": "순조로움", "ai_comment": "회귀 검증 및 변경점 분석 업무가 지연 없이 안정적으로 완료되고 있습니다."}
  ],
  "ai_summary": "전반적으로 주요 검증 업무가 순조롭게 완료되고 있으나, 일부 도구 오류 및 일정 재협의 건에 대한 관리가 필요합니다."
}, ensure_ascii=False))

# ── Minutes ──
save_cache("minutes", json.dumps({
  "meetings": [
    {"date": "2026-03-12", "title": "HCU 제어로직 SW 검증(26년) - 모델 검증(기능안전)", "participants": "HMC(송민기, 남상욱, 정재성), 현대케피코(고일민), 오토에버(송현우), 슈어(정고성, 권영동, 장은서, 주해원)", "summary": ["CN8 HEV Part 6 산출물 관련 질의응답을 진행했습니다.", "프리컨디션 명세 기준, 커버리지 미달성 사유, 테스트 방법론 적용 여부 등 세부 항목을 점검했습니다.", "질의 사항을 정리하여 3월 13일까지 고객사에 전달하기로 협의했습니다."]},
    {"date": "2025-12-11", "title": "25년 HCU 제어로직 SW 검증 완료보고", "participants": "현대케피코(전병춘, 탁영임, 고일민, 이지형 외), 슈어(정은선, 이성배 외)", "summary": ["25년 과제 완료 보고회 진행 및 기능안전 결함 미검출 등 주요 질의응답을 가졌습니다.", "정적 검증 개발자 검토 기준 및 정당화 건수 통계 관리 현황에 대해 설명했습니다.", "GEN2 Trinity 형상 정기 펌웨어 검증 준비 및 투입 인력 상황을 공유했습니다."]},
    {"date": "2025-12-05", "title": "25년 VCU 제어로직 SW 검증 12월 정기 회의", "participants": "슈어(홍수범, 김양수 외 4명), 현대케피코(김성엽, 박은상 외 4명)", "summary": ["AppDesign 유지보수 및 기능안전 진행상황을 공유했습니다.", "차년도 앱디자인 성능개선 및 수행 항목 선정을 위해 1월 중순 회의를 진행하기로 했습니다.", "VCU 기능안전 대응 인원 2명에 대한 향후 활용 방안을 내부 협의 후 전달하기로 했습니다."]},
    {"date": "2025-12-03", "title": "VPC 오토코드 B2B 검증 진행 상황 보고", "participants": "슈어(홍수범, 김현태), 현대자동차(전권수, 조성현, 최윤석, 허현준)", "summary": ["출력값 및 커버리지 불일치 보고 항목 리뷰 및 형상별 오토코드 차이점을 분석했습니다.", "12월 18일 남은 분석 완료 및 12월 26일 완료 보고서 전달 일정을 협의했습니다.", "26년 1월 초에 최종 완료 보고회를 진행하기로 결정했습니다."]},
    {"date": "2025-11-18", "title": "자율주행 협조제어 개발 - 기능안전 Part6 대응", "participants": "슈어(홍수범, 김두희, 최서희), 현대케피코(박은상), 현대자동차(차정화, 이원재, 안정언)", "summary": ["자율주행 FW2, FW3 형상 대응 일정 계획 및 Lv1 범위 검증 제외 여부를 논의했습니다.", "FW2 대응을 위해 VCU 3.5 인력 2명을 충원하여 공수를 9MM로 축소 조정했습니다.", "FW3 형상 공수는 3월 말까지 14MM로 배정하여 진행하기로 협의했습니다."]}
  ],
  "open_action_items": [
    {"item": "CN8 HEV Part 6 테스트 및 검증 산출물 질의사항 정리 및 전달", "owner": "정고성", "due": "2026-03-13", "status": "미완료"},
    {"item": "VPC-S 1.2 84/85S0 검증 결과 산출물 및 분석 레퍼런스 담당자 피드백 회신 대기", "owner": "현대케피코 담당자", "due": "TBD", "status": "미완료"},
    {"item": "중국향 EV/EREV 제어기 정적 검증 수행 룰 셋 및 레퍼런스 확보 기간 HMC 논의", "owner": "홍수범", "due": "TBD", "status": "미완료"},
    {"item": "앱디자인 성능개선 구현 가능 여부 검토 및 테스트 진행", "owner": "이민현", "due": "TBD", "status": "미완료"},
    {"item": "표준화 기법 적용 시스템 아키텍처 작성 및 요구사항 명세 과제 업체 선정 결과 확인", "owner": "정고성", "due": "TBD", "status": "미완료"}
  ],
  "total_open_items": 5
}, ensure_ascii=False))

# ── Projects ──
save_cache("projects", json.dumps({
  "projects": [
    {"name": "자율주행 협조제어 개발 - 기능안전 Part6 대응", "team": "SS3", "client": "현대케피코", "risk_level": "high", "delay_reason": "VDI 접속 에러, FIT 포팅 도구 이슈 및 고객사 추가 산출물 요청", "progress": 41, "status": "진행중"},
    {"name": "25년 VCU 제어로직 SW 검증 - 정기 펌웨어 대응", "team": "SS2", "client": "현대케피코", "risk_level": "medium", "delay_reason": "STATIC 도구 오탐 및 분석 멈춤 현상", "progress": 93, "status": "완료"},
    {"name": "VPC1.1 기반 중국향 EV SW 검증 및 HIL 배포 검증 - 정적", "team": "SS4", "client": "현대케피코", "risk_level": "medium", "delay_reason": "정적 검증 수행 룰 셋 협의 지연 및 형상 수령 대기", "progress": 54, "status": "진행중"},
    {"name": "VPC1.1 기반 중국향 EREV SW 검증 및 HIL 배포 검증 - 정적", "team": "SS2", "client": "현대케피코", "risk_level": "medium", "delay_reason": "매트랩 라이선스 방화벽 해제 지연", "progress": 47, "status": "진행중"},
    {"name": "VPC-S 1.2 HEV 파생 BO4 차종 SW검증", "team": "SS1", "client": "현대케피코", "risk_level": "medium", "delay_reason": "고객사 내부 조직 변경으로 인한 과제 취소", "progress": 0, "status": "지연"},
    {"name": "HCU 제어로직 SW 검증(26년) - 모델 검증", "team": "SS1", "client": "현대케피코", "risk_level": "low", "delay_reason": None, "progress": 0, "status": "진행중"},
    {"name": "VCU 제어로직 SW 검증(26년) - 모델 검증(VPC1.1 모델동적)", "team": "SS4", "client": "현대케피코", "risk_level": "low", "delay_reason": None, "progress": 0, "status": "진행중"},
    {"name": "VPCS1.1 Base 양산 확대 검증", "team": "SS2", "client": "현대케피코", "risk_level": "low", "delay_reason": None, "progress": 0, "status": "제안중"}
  ],
  "risk_summary": {"high": 1, "medium": 4, "low": 3},
  "ai_insight": "VDI 접속 및 라이선스 방화벽 등 인프라 문제와 STATIC, FIT 도구 오류가 주요 지연 원인입니다. 프로젝트 착수 전 선제적인 환경 점검 및 도구 안정성 확보가 필요합니다."
}, ensure_ascii=False))

# ── Resources ──
save_cache("resources", json.dumps({
  "team_loads": [
    {"team": "SDV솔루션1팀", "total_mm": 105.0, "available_mm": 108.0, "load_rate": 97.2, "status": "여유", "hire_needed": 0},
    {"team": "SDV솔루션2팀", "total_mm": 121.0, "available_mm": 113.0, "load_rate": 107.1, "status": "과부하", "hire_needed": 1},
    {"team": "SDV솔루션3팀", "total_mm": 116.0, "available_mm": 113.0, "load_rate": 102.7, "status": "과부하", "hire_needed": 1},
    {"team": "SDV솔루션4팀", "total_mm": 67.0, "available_mm": 68.0, "load_rate": 98.5, "status": "정상", "hire_needed": 0}
  ],
  "total_headcount": {"regular": 37, "intern": 4, "total": 41},
  "reallocation_ideas": [
    "여유 공수가 있는 1팀(3.0 M/M)과 4팀(1.0 M/M)의 가용 인력을 과부하가 예상되는 2팀(-8.0 M/M)과 3팀(-3.0 M/M)의 VCU 제어로직 SW 검증 등 주요 프로젝트에 한시적으로 교차 투입",
    "인력 재배치 시 핵심 보직자 리더십(MBTI) 특성을 반영하여, 체계적이고 꼼꼼한 ISTJ 성향의 리더(2팀 홍수범 팀장)를 보완할 수 있도록 협업과 커뮤니케이션 능력이 뛰어난 1팀의 실무자(ESFJ, ENFJ 등)를 매칭하여 팀 적응력 및 시너지 향상 도모"
  ],
  "ai_insight": "2팀과 3팀에 검증 프로젝트가 집중되어 과부하가 발생 중입니다. 1팀과 4팀의 가용 공수를 활용한 유연한 인력 재배치와 리더십 성향을 고려한 팀원 구성이 시급합니다."
}, ensure_ascii=False))

# ── Innovation ──
save_cache("innovation", json.dumps({
  "ai_productivity": {"target_pct": 10, "current_pct": 0, "trend": "유지"},
  "solutions": [
    {"name": "Model2Doc", "status": "제안중", "progress": 50, "description": "VPC 오토코드 B2B 검증 과제 대상 제안 보류 및 차트 학습 알고리즘 수정 중"},
    {"name": "Model2TC", "status": "개발중", "progress": 30, "description": "AI 학습을 위한 TC 생성 자동화 스크립트 개발 및 양식 논의 중"},
    {"name": "FIT Plug-In", "status": "개발중", "progress": 80, "description": "파일럿 테스트 수행 완료 및 임베디드 검증 환경 적용 방안 논의 중"},
    {"name": "STATIC StandAlone", "status": "제안중", "progress": 100, "description": "VPC-P M7 검증 용역 중간보고 시 도구 제안 완료"}
  ],
  "tfts": [],
  "ai_insight": "AI 기반 정적 검증 및 TC 생성 자동화가 진행 중이나, 일부 솔루션 제안이 보류되며 가시적 지표는 미비함."
}, ensure_ascii=False))

# ── Assets ──
save_cache("assets", json.dumps({
  "guidelines": [
    {"title": "보안 서약 및 교육", "summary": "신규 인원 대상 보안서약서, 개인정보동의서 작성 및 보안 교육 실시", "category": "보안", "priority": "high"},
    {"title": "업무 환경 보안 실사", "summary": "프로젝트 룸 인원 및 업무 PC 대상 보안 프로그램 세팅 및 실사 점검", "category": "보안", "priority": "high"},
    {"title": "문서 보안(DRM) 관리", "summary": "개인정보 동의 누락 및 중복 로그인(CODE:65)으로 인한 DRM 장애 조치", "category": "운영", "priority": "medium"}
  ],
  "licenses": [
    {"tool": "MATLAB", "expire_date": "2025-07-31", "status": "만료", "affected_users": 2, "action": "견적 요청 및 라이선스 구매 품의 진행"},
    {"tool": "MATLAB", "expire_date": "2025-05-31", "status": "만료", "affected_users": 4, "action": "1년 연장 4 Copy 발주 및 갱신 적용"},
    {"tool": "STATIC, CT", "expire_date": "2025-05-06", "status": "만료", "affected_users": 1, "action": "신규 라이선스 1 Copy 신청 및 수령"},
    {"tool": "MI, MV", "expire_date": "2024-11-06", "status": "만료", "affected_users": 3, "action": "신규 라이선스 3 Copy 신청 및 수령"},
    {"tool": "케피코 필수 라이선스", "expire_date": "미상", "status": "만료", "affected_users": 10, "action": "신규 구매 및 트라이얼 버전 임시 대체"}
  ],
  "ai_insight": "보안 규정은 원활히 준수되나 다수의 필수 도구 라이선스가 만료되어 신속한 갱신이 필요함."
}, ensure_ascii=False))

print("\n✅ 모든 캐시 시딩 완료!")

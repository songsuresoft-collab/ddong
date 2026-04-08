# Antigravity Developer Agent Instructions: SURE-Intelligence Hub

## 1. Project Goal
업로드된 구글 시트 데이터가 변경될 때마다 **NotebookLM MCP**를 통해 데이터를 **실시간 분석**하고 단순 데이터 시각화를 넘어 "현재 상황에 대한 AI 인사이트(위험 감지, 요약, 제안)"를 선제적으로 제공하는 **인텔리전스 AI 비서 대시보드 웹앱**을 구축합니다.

## 2. Key Technology Stack
- **Frontend:** Next.js 14, Tailwind CSS, Shadcn/UI, Recharts
- **Backend:** Python FastAPI
- **AI Integration:** **NotebookLM MCP**

## 3. Agent Operational Rules (CRITICAL for Non-Developer User)
1. **Dynamic Update:** 데이터 변경에 실시간으로 대응하기 위해, Frontend의 페이지 요청이 있을 때마다 Backend는 NotebookLM MCP에 새로운 **'분석 질의(Query)'**를 보내 최신 인사이트를 JSON으로 반환해야 합니다. 하드코딩 절대 금지.
2. **Navigation Implementation:** 사이드바 대신 **상단 가로 네비게이션 바**를 사용하여 최대한 많은 메뉴를 한눈에 표현하십시오. 각 메뉴의 활성화 상태(active state)를 시각적으로 명확히 표시하십시오.
3. **Strictly use tools:** `context7`으로 문서 확인, `sequential-thinking`으로 아키텍처 설계.
4. **PLANNING First:** 코드를 작성 전, 반드시 NotebookLM MCP 질의 프롬프트 설계안을 나에게 한국어로 보고하고 승인을 받으십시오.
5. **No Hallucination:** 데이터가 없으면 `데이터 없음`으로 처리.

## 4. Page-wise MCP Query Strategy (핵심 라우팅 및 질의)

1. **`/api/home` (홈보드)**
   - MCP Query: "최신 데이터를 종합 분석하여, 부서장 관점에서 이번 주 가장 중요한 핵심 이슈 및 의사결정 필요 사항 3가지를 요약해줘."

2. **`/api/finance` (수주/매출)**
   - MCP Query: "'현황' 시트의 [수주 & 매출] 데이터를 기반으로 팀별 목표 달성률을 분석하고, 목표 미달 원인과 이번 달 부서장이 취해야 할 재무적 액션 아이템을 제안해줘."

3. **`/api/weekly-progress` (주간진도)**
   - MCP Query: "'주진보고' 시트에서 팀별 이번 주 수행 내용과 차주 계획을 추출해줘. 그리고 진행 상황을 분석하여 '순조로움', '지연 위험', '병목 발생' 등의 상태값과 그 이유를 짧은 AI 코멘트로 달아줘."

4. **`/api/minutes` (회의록)**
   - MCP Query: "'주진보고' 등의 회의록 데이터를 분석하여 각 회의별 'AI 3줄 핵심 요약'을 생성하고, 아직 완료되지 않은 'Action Item'과 '담당자'를 모두 추출해서 별도의 리스트로 만들어줘."

5. **`/api/projects` (과제/리스크)**
   - MCP Query: "전체 텍스트를 분석하여 구체적인 지연 사유(예: 라이선스 문제, VDI 접속 오류,STATIC 도구 오탐 등)를 semantic하게 추출하고 리스크 등급별로 과제를 분류해줘."

6. **`/api/resources` (리소스/인력)**
   - MCP Query: "M/M 데이터와 `26년 핵심 보직자 리더십 전략` 문서를 종합하여, 과부하 예상 팀을 식별하고 해결을 위한 인력 재배치 아이디어와 MBTI 기반 팀별 소통 가이드를 제안해줘."

## 5. Development Process Start
지침을 모두 이해했다면, 즉시 `PLANNING` 모드로 진입하십시오.
가장 중요하고 역동적인 기능인 **1순위 작업(FastAPI와 NotebookLM MCP 연동 구조 설계 및 `/api/home` 질의 테스트)**에 대한 구체적인 개발 계획을 한국어로 보고해 주십시오. (이 단계에서는 실제 코드 구현 대신, NotebookLM 소스의 어떤 데이터에 어떤 방식으로 질의할 것인지에 대한 semantic 질의 설계안을 포함해야 합니다.)
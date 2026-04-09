# SDV Onboarding System: 기능 명세 및 기술 스택 상세 분석

본 문서는 온보딩 시스템의 각 모듈별 상세 기능과 이를 구현하기 위해 사용된 프론트엔드/백엔드/AI 기술 스택을 기술적인 관점에서 명세합니다.

---

## 1. 공통 기술 아키텍처 (System Architecture)
전체 시스템은 고도의 인터랙티브한 UI와 AI 기반의 동적 데이터를 처리하기 위해 다음과 같은 스택을 공유합니다.

*   **Frontend**: Next.js (React), CSS Modules (Vanilla CSS 고도화), Material Symbols (Icons)
*   **Backend**: FastAPI (Python 3.12), Uvicorn (ASGI server)
*   **Networking**: HTTP/1.1 REST API (Body: JSON), SSE (Streaming/Polling)
*   **Tools**: Git (DH Branch management), Google Apps Script (Database proxy)

---

## 2. 모듈별 상세 기능 및 기술 매핑

### [Module 1] Onboarding Guideline (지능형 가이드)
전사 온보딩 가이드 문서를 학습한 AI를 통해 신입사원의 질문에 답변하고, 스스로 가이드를 읽어 질문을 추천합니다.

| 분류 | 상세 기능 | 적용 기술 스택 (Tech Stack) |
| :--- | :--- | :--- |
| **핵심 기능** | AI 챗봇 답변 생성 | `FastAPI` + `NotebookLM (mcp_client)` |
| | 지능형 질문 추천 (Auto-gen) | `NotebookLM Context Analysis` |
| | 인용구 정밀 제거 (Data Cleaning) | `Regex (JS /\[\d+(?:[\s,\-]*\d+)*\]/g)` |
| **UX/UI** | 입력 중 애니메이션 | `CSS Keyframes` (TypingIndicator) |
| | 추천 질문 스태거 효과 | `CSS Variables` + `nth-child animation-delay` |
| | 로딩 상태 스켈레톤 | `Glassmorphism CSS` + `Pulsing animation` |

---

### [Module 2] My Progress (진척도 대시보드)
개인의 행정 및 설치 프로세스 이행률을 관리하고, 팀 단위의 적응 현황을 모니터링합니다.

| 분류 | 상세 기능 | 적용 기술 스택 (Tech Stack) |
| :--- | :--- | :--- |
| **핵심 기능** | 개인 체크리스트 상태 관리 | `React State Management` (toggleItem) |
| | 팀원별 온보딩 데이터 분석 | `Mock API` + `FastAPI Serialization` |
| | 부서 적응도 통계 산출 | `JS Mathematical Logic` (Accumulated stats) |
| **UX/UI** | 고정밀 프로그레스 링 | `SVG stroke-dasharray` / `stroke-dashoffset` |
| | 카드 기반 마일스톤 UI | `CSS Flexbox` & `Interactive Hover States` |
| | 멤버 상세 분석 리포트 | `CSS Grid Layout` + `Conditional Rendering` |

---

### [Module 3] Self Growth (자기개발 & 교육)
구글 시트 기반의 사내 교육 관리와 웹 검색 엔진을 결합한 글로벌 컨퍼런스 실시간 조회를 제공합니다.

| 분류 | 상세 기능 | 적용 기술 스택 (Tech Stack) |
| :--- | :--- | :--- |
| **핵심 기능** | 교육 과정 CRUD (입력/삭제) | `Google Apps Script API` + `httpx (Python)` |
| | 컨퍼런스 실시간 웹 검색 | `Tavily AI Search Engine` |
| | 데이터 선택적 동기화 (Sync) | `POST Body parameter logic` (overwrite/append) |
| **UX/UI** | 교육 추가 레이어 | **`React Portals`** (DOM escaping technique) |
| | 동기화 옵션 메뉴 | `CSS Absolute Positioning` + `Global Click Listener` |
| | 통합 브랜드 로딩 시스템 | `Glassmorphism Backdrop` + `Animated SVG Spinner` |

---

## 3. 외부 서비스 통합 명세 (Integration)

### 🤖 AI Engine Layer
*   **Google NotebookLM**: 비정형 문서(PDF, Sheets, Docs)를 구조화된 지식 베이스로 변환하고 질문에 대한 Contextual Answer 제공.
*   **Tavily AI**: 실시간 웹 조회를 통해 가장 최신의 기술 컨퍼런스 정보를 수집하고 소스 데이터로 공급.

### 📊 Persistence Layer (Google Workspace)
*   **Google Sheets API Proxy**: 구글 시트를 가벼운 NoSQL 데이터베이스처럼 사용하기 위해 `Apps Script`를 중간 매개체로 활용하여 보안과 실시간성을 확보.

---

## 4. 요약 및 특이 사항
본 시스템은 **"사용자는 단순하게, 로직은 정교하게"**라는 원칙하에 설계되었습니다. 특히 프론트엔드에서는 **React Portals**와 **CSS 애니메이션**을 극한으로 활용하여 웹임에도 불구하고 마치 네이티브 앱과 같은 매끄러운 경험을 제공하며, 백엔드에서는 **AI 에이전트 워크플로우**를 통해 데이터 관리의 자동화를 이뤄냈습니다.

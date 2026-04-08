# 🛰️ SURE-Intelligence Hub — Total Master Dashboard

> **SDV시스템실 통합 AI 인텔리전스 대시보드**  
> NotebookLM MCP 기반 실시간 AI 분석 · 수주/매출 현황 · 지식 기반 시스템 및 에셋 자동화

---

## 📌 프로젝트 개요

구글 시트 및 문서, NotebookLM에 업로드된 실데이터가 변경될 때마다, **NotebookLM MCP**를 통해 데이터를 실시간 분석하고  
단순 시각화를 넘어 **"현재 상황에 대한 AI 인사이트(위험 감지 · 요약 · 퀴즈 생성 등)"를 선제적으로 제공**하는  
SDV시스템실 전용 인텔리전스 AI 비서 대시보드 웹앱입니다.

---

## 🏗️ 기술 스택

| 레이어 | 기술 |
|--------|------|
| **Frontend** | Next.js 14, TypeScript, CSS Modules, Chart.js (react-chartjs-2) |
| **Backend** | Python FastAPI, Uvicorn |
| **AI Integration** | **NotebookLM MCP** (`notebooklm-mcp-server`) |
| **캐싱** | Stale-While-Revalidate 파일 캐시 + 메모리 캐시 (`backend/cache/`) |
| **통신 인프라** | Next.js API Rewrites 기반 동형 프록싱 (최대 5분 대기 타임아웃 세팅) |
| **스타일** | Glassmorphism, UI 통합 (Jura / Outfit 폰트, 사이버펑크 네온 및 스카이블루 아키텍처) |

---

## 🗂️ 프로젝트 구조

```text
sdv-dashboard-view-app/
├── frontend/                     # Next.js 14 프론트엔드
│   ├── app/
│   │   ├── finance/page.tsx          # 수주/매출 대시보드 (SS 이식)
│   │   ├── home/page.tsx             # 홈보드
│   │   ├── weekly-progress/page.tsx  # 주간 진도 (SS3 이식)
│   │   ├── minutes/page.tsx          # 회의록 (SS3 이식)
│   │   ├── knowledge-base/page.tsx   # SDV Knowledge Base (SS4 이식: AI 요약 및 퀴즈)
│   │   ├── onboarding/page.tsx       # 신규 입사자 가이드북 (SS4 이식)
│   │   ├── projects/page.tsx         # 과제/리스크(SS2 이식)
│   │   ├── resources/page.tsx        # 리소스/인력(SS2 이식)
│   │   ├── sdv-solution/             # SDV 검증 솔루션 뷰어 (SS1이식) (코드 정적, 모델 정적 등 뷰어)
│   │   └── components/
│   │       └── TopNavBar.tsx         # 상단 가로 네비게이션
│   ├── next.config.ts                # 프록시 설정 (긴 실행 시간 5분 허용 조치)
│   └── styles/
│       └── globals.css
│
├── backend/                      # FastAPI 백엔드
│   ├── main.py                   # 서버 진입점 + 백그라운드 프리로딩, CORS 설정
│   ├── routers/
│   │   ├── finance.py            # /api/finance
│   │   ├── home.py               # /api/home
│   │   ├── weekly.py             # /api/weekly-progress
│   │   ├── knowledge_base.py     # /api/knowledge-base (요약 및 퀴즈 생성 처리)
│   │   ├── onboarding.py         # /api/onboarding
│   │   ├── minutes.py            # /api/minutes
│   │   ├── projects.py           # /api/projects
│   │   └── resources.py          # /api/resources
│   └── services/
│       └── mcp_client.py         # NotebookLM MCP 통신 클라이언트 (무한 대기 및 타임아웃 예외 개선)
│
├── convert_cookies.py            # auth.json 쿠키 컨버터 스크립트
└── README.md
```

---

## 🚀 실행 방법

### 1. 사전 조건

- Node.js 18+
- Python 3.11+
- **Google Chrome 웹 브라우저** (인증용)

---

### 🔑 최초 설정 가이드: NotebookLM API 인증 (필수)

다른 팀원(또는 다른 PC)에서 Git 저장소를 처음 내려받아 서버를 구동하기 전, 반드시 다음 절차를 통해 NotebookLM 로컬 인증을 완료해야 합니다.

1. **글로벌 인증 CLI 실행**
   터미널에서 아래 명령어를 실행합니다.
   ```bash
   nlm login
   ```
   > **참고**: 명령어를 실행하면 크롬 브라우저가 자동으로 팝업됩니다. 화면의 안내에 따라 본인의 Google 계정으로 로그인하여 세션을 저장해 주세요. 성공하면 "cookies saved" 메시지가 뜹니다.

2. **로컬 쿠키 변환 스크립트 실행**
   프로젝트 루트 경로에 포함된 컨버터 스크립트를 실행하여, 다운로드된 쿠키를 MCP 서버가 인식할 수 있는 전용 경로(`~/.notebooklm-mcp/auth.json`)로 복사합니다.
   ```bash
   python convert_cookies.py
   ```
   > "Cookies successfully converted and saved to auth.json!" 메시지가 출력되면 인증 세팅이 완료된 것입니다. 이제 서버를 구동할 수 있습니다.

### 2. 백엔드 실행

```bash
cd backend
pip install fastapi uvicorn
# 8000번 포트에서 백엔드 앱 실행 (CORS 처리 완료됨)
python -m uvicorn main:app --port 8000 --reload
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
# 3002번 포트에서 프론트엔드 서버 실행
npm run dev
# → http://localhost:3002
```

---

## 📡 MCP 질의 구조 (모듈별)

| 페이지 | 엔드포인트 | NotebookLM AI 처리 임무 |
|--------|-----------|----------------|
| **홈보드** | `/api/home` | 부서장 관점 핵심 이슈 3가지 요약 (우측 A.I Timeline에 표현) |
| **수주/매출** | `/api/finance` | 팀별 KPI · 월별 예상/실적 대비 추출 및 리스크 조기 경보 발생 |
| **Knowledge Base** | `/api/knowledge-base` | 가이드/문서 내용의 3단락 핵심 요약 기능 및 고난도 10문항 생성형 AI 퀴즈 |
| **Onboarding** | `/api/onboarding` | 신입 사원용 최신 회사/절차 가이드북 Q&A 질의응답 대응 |
| **주간진도** | `/api/weekly-progress` | 팀별 진행상황 + 상태값 AI 코멘트화 |
| **회의록** | `/api/minutes` | 주간 회의 자료 기반 AI 3줄 요약 + Action Item 의무 도출 |
| **과제/리스크** | `/api/projects` | 리스크 등급별 분류 + 지연 사유 및 블로커 추출 |
| **리소스** | `/api/resources` | 과부하 팀 식별 + 인력 재배치 제안 구조화 |

---

## 💡 핵심 기능 및 최근 업데이트

- **대규모 언어 모델 무한 대기**: 고난도 퀴즈(생성 소요 1분 이상) 대응을 위한 `next.config.ts` Proxy Timeout 5분 연장 및 `mcp_client.py` 타입 에러 해결 적용
- **실시간 AI 인사이트 동기화**: `[SYNC]` 컴포넌트를 통한 강제 갱신으로 NotebookLM MCP 재질의 기능 활성화
- **다중 시스템 병합**: 브랜치 등에서 개발된 APP 기능 Total 마스터 대시보드에 완벽히 이식 적용 
- **Graceful Fallback & Caching**: SWR 패턴으로 오프라인 및 MCP 통신 실패 시에도 MOCK 데이터를 렌더링 유지
- **픽셀 퍼펙트 UI 시스템**: 원본 Antigravity UI, 화이트 프로페셔널 UI (SS4) 별 다크/반투명 그라데이션 일관성 병합

---

## 🔐 보안 위험 및 주의사항

- `*.cookies.json` 파일, `auth.json` 같은 인증 크리덴셜은 로컬 스토리지에만 보관하며 **절대 Git 커밋 불가**하도록 룰 적용 중입니다.
- 캐시 스토리지(`backend/cache/`)도 마찬가지로 배제됩니다.

---

*Built with ❤️ by SDV시스템실 AI Intelligence Team*

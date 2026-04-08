"""
SURE-Intelligence Hub — FastAPI Backend
NotebookLM MCP stdio 연동 메인 앱
- Windows Exit code -1073741510 방지 시그널 핸들링 포함
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import signal
import sys

from routers import home, finance, weekly, minutes, projects, resources, knowledge_base, onboarding
from services.mcp_client import shutdown_mcp, shutdown_mcp_sync, load_all_disk_cache, preload_all_caches


# ──────────────────────────────────────────────
# Windows 시그널 핸들러 (Exit code -1073741510 방지)
# ──────────────────────────────────────────────
_shutting_down = False


def _graceful_shutdown_handler(signum, frame):
    """Ctrl+C 시그널을 잡아서 MCP 프로세스를 깨끗이 종료합니다."""
    global _shutting_down
    if _shutting_down:
        return  # 이미 종료 중이면 무시
    _shutting_down = True

    sig_name = signal.Signals(signum).name if signum else "UNKNOWN"
    print(f"\n[APP] 시그널 수신: {sig_name} — Graceful 종료 시작...")

    # MCP 프로세스를 동기적으로 즉시 정리
    try:
        shutdown_mcp_sync()
    except Exception as e:
        print(f"[APP] MCP 종료 중 오류: {e}")

    print("[APP] 정리 완료. 서버를 종료합니다.")
    sys.exit(0)


# 시그널 핸들러 등록
signal.signal(signal.SIGINT, _graceful_shutdown_handler)
signal.signal(signal.SIGTERM, _graceful_shutdown_handler)
if sys.platform == "win32":
    try:
        signal.signal(signal.SIGBREAK, _graceful_shutdown_handler)
    except (AttributeError, OSError):
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ① 디스크 캐시 복원 (즉시 — 파일에서 메모리로)
    load_all_disk_cache()
    print("[APP] SURE-Intelligence Hub 서버 시작")

    # ② 백그라운드에서 프리로딩 (MCP 질의로 캐시 갱신)
    preload_task = asyncio.create_task(_preload_background())

    try:
        yield
    except Exception as e:
        print(f"[APP] Lifespan 오류: {e}")
    finally:
        # 프리로딩 태스크 취소
        if not preload_task.done():
            preload_task.cancel()
            try:
                await preload_task
            except asyncio.CancelledError:
                pass

        # 종료 시 MCP 서버 정리
        try:
            await shutdown_mcp()
        except Exception as e:
            print(f"[APP] MCP 종료 오류: {e}")
        print("[APP] 서버 종료")


async def _preload_background():
    """서버 시작 후 약간의 딜레이를 두고 프리로딩을 실행합니다."""
    try:
        await asyncio.sleep(2)  # 서버가 완전히 준비된 후 실행
        await preload_all_caches()
    except asyncio.CancelledError:
        print("[PRELOAD] 프리로딩 취소됨 (서버 종료)")
    except Exception as e:
        print(f"[PRELOAD] 프리로딩 오류: {e}")


app = FastAPI(
    title="SURE-Intelligence Hub API",
    description="SDV시스템실 AI 비서 대시보드 백엔드 - NotebookLM MCP 연동",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 설정 (Next.js :3000 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3002", "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(home.router, prefix="/api")
app.include_router(finance.router, prefix="/api")
app.include_router(weekly.router, prefix="/api")
app.include_router(minutes.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(knowledge_base.router, prefix="/api")
app.include_router(onboarding.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "service": "SURE-Intelligence Hub API",
        "notebook_id": "86753a47-441a-47d7-a7f2-b65f10bbac55",
        "endpoints": [
            "/api/home", "/api/finance", "/api/weekly-progress",
            "/api/minutes", "/api/projects", "/api/resources",
            "/api/knowledge-base/documents", "/api/onboarding/guide"
        ]
    }


@app.get("/health")
async def health():
    from services.mcp_client import get_all_cache_status, _mcp_proc, _initialized
    return {
        "status": "ok",
        "mcp_process_alive": _mcp_proc is not None and _mcp_proc.poll() is None,
        "mcp_initialized": _initialized,
        "cache": get_all_cache_status(),
    }

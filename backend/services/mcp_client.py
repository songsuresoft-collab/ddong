"""
NotebookLM MCP 클라이언트 (Windows 호환 버전)
- subprocess.Popen (동기) + ThreadPoolExecutor로 asyncio 연동
- JSON-RPC 2.0 stdio 프로토콜 (notebooklm-mcp-server@latest)
- 영구 파일 캐시 + 메모리 캐시 (Stale-While-Revalidate)
- 서버 시작 시 프리로딩
"""
import json
import time
import os
import sys
import subprocess
import threading
import asyncio
import hashlib
import signal
from pathlib import Path
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

# Windows cp949 인코딩 문제 방지 — stdout/stderr를 UTF-8로 재설정
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


NOTEBOOK_ID = "08b60625-8583-474c-a69d-347cd623ca28"  # 2026 SDV시스템실 통합 관리 AI Assistant 개발 (수주/매출/프로젝트 실데이터)

# ──────────────────────────────────────────────
# 캐시 설정
# ──────────────────────────────────────────────
CACHE_DIR = Path(__file__).parent.parent / "cache"

# 키별 TTL 정책 (초 단위)
# NotebookLM 세션 쿠키가 8~12시간마다 만료되므로,
# MCP 재질의 빈도를 최소화하여 인증 만료 가능성을 줄입니다.
CACHE_TTL_POLICIES = {
    "home":       4  * 60 * 60,   # 4시간  (부서장 브리핑 — 반나절에 한 번)
    "finance":    12 * 60 * 60,   # 12시간 (수주/매출은 하루 1~2회 변동)
    "weekly":     72 * 60 * 60,   # 72시간 (주간보고 — 주 1회 갱신)
    "minutes":    72 * 60 * 60,   # 72시간 (회의록 — 이력 데이터)
    "projects":   24 * 60 * 60,   # 24시간 (과제 리스크 — 하루 1회)
    "resources":  24 * 60 * 60,   # 24시간 (인력 현황 — 하루 1회)
    "innovation": 48 * 60 * 60,   # 48시간 (TFT 진척 — 이틀 1회)
    "assets":     72 * 60 * 60,   # 72시간 (지침/에셋 — 거의 안 바뀜)
}
DEFAULT_TTL = 4 * 60 * 60  # 기본 4시간

# 갱신 트리거: TTL의 70% 지나면 백그라운드 갱신 (너무 잦은 재질의 방지)
STALE_RATIO = 0.7

_cache: dict[str, dict] = {}       # 메모리 캐시
_refresh_lock: dict[str, bool] = {} # 백그라운드 갱신 중복 방지
_preloading_keys: set[str] = set()  # 프리로딩 진행 중인 키 (중복 방지)
_file_lock = threading.Lock()

# ──────────────────────────────────────────────
# 영구 파일 캐시
# ──────────────────────────────────────────────
def _cache_file_path(key: str) -> Path:
    """캐시 키를 안전한 파일명으로 변환합니다."""
    safe = hashlib.md5(key.encode()).hexdigest()[:16]
    # 읽기 쉽도록 키의 앞 부분도 파일명에 포함
    prefix = "".join(c if c.isalnum() else "_" for c in key[:30])
    return CACHE_DIR / f"{prefix}__{safe}.json"


def _save_to_disk(key: str, data: dict, ts: float):
    """캐시 데이터를 디스크에 저장합니다."""
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_entry = {"key": key, "data": data, "ts": ts}
        fpath = _cache_file_path(key)
        with _file_lock:
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(cache_entry, f, ensure_ascii=False, indent=2)
        print(f"[CACHE] 디스크 저장: {fpath.name}")
    except Exception as e:
        print(f"[CACHE] 디스크 저장 실패: {e}")


def _load_from_disk(key: str) -> Optional[dict]:
    """디스크에서 캐시 데이터를 읽습니다."""
    fpath = _cache_file_path(key)
    if not fpath.exists():
        return None
    try:
        with _file_lock:
            with open(fpath, "r", encoding="utf-8") as f:
                entry = json.load(f)
        return entry
    except Exception as e:
        print(f"[CACHE] 디스크 읽기 실패: {e}")
        return None


def load_all_disk_cache():
    """서버 시작 시 디스크 캐시를 메모리로 전부 복원합니다."""
    if not CACHE_DIR.exists():
        print("[CACHE] 디스크 캐시 없음 (첫 실행)")
        return

    loaded = 0
    for fpath in CACHE_DIR.glob("*.json"):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                entry = json.load(f)
            key = entry["key"]
            _cache[key] = {"data": entry["data"], "ts": entry["ts"]}
            loaded += 1
        except Exception as e:
            print(f"[CACHE] 파일 복원 실패 ({fpath.name}): {e}")

    if loaded:
        print(f"[CACHE] 디스크에서 {loaded}개 캐시 복원 완료")


# ──────────────────────────────────────────────
# MCP 프로세스 관리 (스레드 안전)
# ──────────────────────────────────────────────
_mcp_proc: Optional[subprocess.Popen] = None
_mcp_lock = threading.Lock()
_query_lock = threading.Lock()  # MCP 질의는 반드시 직렬화
_msg_counter = 0
_initialized = False
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="mcp_worker")


def _next_id() -> int:
    global _msg_counter
    _msg_counter += 1
    return _msg_counter


def _send(proc: subprocess.Popen, msg: dict):
    """JSON-RPC 메시지를 프로세스 stdin으로 전송"""
    line = json.dumps(msg, ensure_ascii=False) + "\n"
    proc.stdin.write(line.encode("utf-8"))
    proc.stdin.flush()


def _read_until_id(proc: subprocess.Popen, target_id: int, timeout: float | None = 120) -> Optional[dict]:
    """특정 ID의 JSON-RPC 응답이 올 때까지 stdout을 읽습니다."""
    deadline = (time.time() + timeout) if timeout is not None else None
    while deadline is None or time.time() < deadline:
        try:
            # 프로세스 종료 확인
            if proc.poll() is not None:
                print(f"[MCP] 프로세스가 이미 종료됨 (returncode={proc.returncode})")
                return None
            line = proc.stdout.readline()
            if not line:
                print("[MCP] stdout EOF — 프로세스 종료됨")
                return None
            decoded = line.decode("utf-8", errors="replace").strip()
            if not decoded:
                continue
            try:
                msg = json.loads(decoded)
                if msg.get("id") == target_id:
                    return msg
            except json.JSONDecodeError:
                pass
        except (BrokenPipeError, OSError) as e:
            print(f"[MCP] 파이프 오류 (프로세스 종료됨): {e}")
            return None
        except Exception as e:
            print(f"[MCP] 읽기 오류: {e}")
            return None
    print(f"[MCP] 응답 타임아웃 (id={target_id}, {timeout}초)")
    return None


def _ensure_process() -> Optional[subprocess.Popen]:
    """MCP 서버 프로세스를 확인하고, 없으면 시작합니다. (스레드 안전)"""
    global _mcp_proc, _initialized

    with _mcp_lock:
        if _mcp_proc is not None:
            if _mcp_proc.poll() is None:
                return _mcp_proc
            print(f"[MCP] 프로세스 종료 감지 (returncode={_mcp_proc.returncode}). 재시작...")
            _mcp_proc = None
            _initialized = False

        import sys, os
        venv_scripts = os.path.dirname(sys.executable)
        mcp_exe = os.path.join(venv_scripts, "notebooklm-mcp.exe" if sys.platform == "win32" else "notebooklm-mcp")
        if not os.path.exists(mcp_exe):
            mcp_exe = "notebooklm-mcp" # fallback
        cmd = [mcp_exe]
        print(f"[MCP] 서버 시작: {' '.join(cmd)}")

        try:
            # CREATE_NEW_PROCESS_GROUP: Ctrl+C가 자식 프로세스로 전파되지 않도록 격리
            # 이것이 Exit code -1073741510 (STATUS_CONTROL_C_EXIT) 방지의 핵심
            creation_flags = 0
            if sys.platform == "win32":
                creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP

            proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=dict(os.environ),
                cwd=os.path.expanduser("~"),
                creationflags=creation_flags,
            )
        except Exception as e:
            print(f"[MCP] 프로세스 생성 실패: {e}")
            return None

        print(f"[MCP] PID: {proc.pid}")

        msg_id = _next_id()
        _send(proc, {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"roots": {"listChanged": False}},
                "clientInfo": {"name": "sdv-dashboard", "version": "1.0.0"},
            },
        })

        resp = _read_until_id(proc, msg_id, timeout=None)

        if resp and "result" in resp:
            _send(proc, {"jsonrpc": "2.0", "method": "notifications/initialized"})
            _mcp_proc = proc
            _initialized = True
            print("[MCP] 초기화 완료 [OK]")
            return proc
        else:
            try:
                stderr = proc.stderr.read(2000).decode("utf-8", errors="replace")
                print(f"[MCP] 초기화 실패. stderr={stderr[:500]}")
            except Exception:
                pass
            proc.kill()
            return None


# 인증 만료 키워드 목록
_AUTH_EXPIRED_KEYWORDS = [
    "Authentication expired",
    "re-authenticate",
    "auth to re-auth",
    "No answer received",
    "Authentication failed",
    "authentication",
]

_reauth_lock = threading.Lock()
_last_reauth_time: float = 0
REAUTH_COOLDOWN = 300  # 5분 이내 재인증 중복 방지


def _is_auth_error(text: str) -> bool:
    """텍스트에서 인증 만료 여부를 감지합니다."""
    lower = text.lower()
    return any(k.lower() in lower for k in _AUTH_EXPIRED_KEYWORDS)


def _try_auto_reauth() -> bool:
    """
    인증 만료 감지 시 저장된 Google 세션으로 자동 재인증을 시도합니다.
    (5분 이내 재인증 중복 방지)
    """
    global _last_reauth_time, _mcp_proc, _initialized

    with _reauth_lock:
        now = time.time()
        if now - _last_reauth_time < REAUTH_COOLDOWN:
            print(f"[AUTH] 재인증 쿨다운 중 ({int(REAUTH_COOLDOWN - (now - _last_reauth_time))}초 남음)")
            return False

        _last_reauth_time = now
        print("[AUTH] 인증 만료 감지 — 자동 재인증 시도...")

        try:
            # 기존 MCP 프로세스 종료
            with _mcp_lock:
                if _mcp_proc and _mcp_proc.poll() is None:
                    _mcp_proc.kill()
                _mcp_proc = None
                _initialized = False

            # notebooklm-mcp-cli (nlm login) 재인증
            import sys, os
            venv_scripts = os.path.dirname(sys.executable)
            nlm_exe = os.path.join(venv_scripts, "nlm.exe" if sys.platform == "win32" else "nlm")
            if not os.path.exists(nlm_exe):
                nlm_exe = "nlm"
            auth_cmd = [nlm_exe, "login"]
            result = subprocess.run(
                auth_cmd,
                capture_output=True,
                timeout=60,
                env=dict(os.environ),
                cwd=os.path.expanduser("~"),
            )
            stdout = result.stdout.decode("utf-8", errors="replace")
            stderr = result.stderr.decode("utf-8", errors="replace")

            if "successful" in stdout.lower() or "cookies saved" in stdout.lower():
                print("[AUTH] 자동 재인증 성공! MCP 재시작...")
                return True
            else:
                print(f"[AUTH] 자동 재인증 실패 (수동 재인증 필요)")
                print(f"[AUTH] stdout: {stdout[:200]}")
                return False

        except subprocess.TimeoutExpired:
            print("[AUTH] 자동 재인증 타임아웃 (수동 재인증 필요)")
            return False
        except Exception as e:
            print(f"[AUTH] 자동 재인증 오류: {e}")
            return False


class NotebookLMClient:
    """
    NotebookLM MCP 도구들을 호출하기 위한 범용 클라이언트.
    research_start, source_add, research_status 등 모든 도구를 지원합니다.
    """
    def __init__(self):
        pass

    def call_tool_sync(self, tool_name: str, arguments: dict, timeout: int = 120) -> dict:
        """동기 방식으로 도구를 호출합니다."""
        proc = _ensure_process()
        if proc is None:
            return {"success": False, "error": "MCP 서버를 시작할 수 없습니다."}

        msg_id = _next_id()
        _send(proc, {
            "jsonrpc": "2.0",
            "id": msg_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        })
        print(f"[MCP] 도구 호출 (id={msg_id}): {tool_name}")

        response = _read_until_id(proc, msg_id, timeout=timeout)

        if response is None:
            global _mcp_proc, _initialized
            with _mcp_lock:
                _mcp_proc = None
                _initialized = False
            return {"success": False, "error": "응답 타임아웃"}

        if "error" in response:
            return {"success": False, "error": response["error"].get("message", "알 수 없는 오류")}

        # 성공 시 결과 반환
        result = response.get("result", {})
        
        # content가 있고 그 안에 텍스트가 있다면 answer/text로 추출하여 success와 함께 반환
        # NotebookLM 도구들은 보통 {"content": [{"type": "text", "text": "..."}]} 형태임
        content = result.get("content", [])
        extracted_texts = []
        for item in content:
            if isinstance(item, dict) and "text" in item:
                extracted_texts.append(item["text"])
        
        final_result = {"success": True, "raw": result}
        if extracted_texts:
            final_result["answer"] = "\n".join(extracted_texts).strip()
            
        # 리서치 툴(research_start)의 경우 task_id가 결과 텍스트에 포함되거나 별도 필드일 수 있음
        # nlm-mcp-server의 특성에 맞춰 추가 필드 정규화
        if "task_id" in str(result):
             import re
             tid_match = re.search(r"ID:\s*([a-f0-9\-]+)", str(result))
             if tid_match:
                 final_result["task_id"] = tid_match.group(1)
        
        # 직접 필드로 오는 경우
        if "task_id" in result:
             final_result["task_id"] = result["task_id"]

        return final_result

    async def call_tool(self, tool_name: str, arguments: dict, timeout: int = 120) -> dict:
        """비동기 방식으로 도구를 호출합니다."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_executor, self.call_tool_sync, tool_name, arguments, timeout)


def _call_notebook_query_sync(query: str, _retry: bool = True, notebook_id: Optional[str] = None) -> dict:
    """동기 방식으로 MCP notebook_query를 호출합니다. 인증 만료 시 자동 재시도."""
    client = NotebookLMClient()
    actual_notebook_id = notebook_id if notebook_id else NOTEBOOK_ID
    
    result = client.call_tool_sync("notebook_query", {
        "notebook_id": actual_notebook_id,
        "query": query,
    })

    if not result["success"]:
        return {"answer": result.get("error", "오류 발생"), "success": False}

    actual_answer = result.get("answer", "")
    conversation_id = None
    
    # JSON 언래핑 (기존 로직 유지)
    try:
        wrapper = json.loads(actual_answer)
        if isinstance(wrapper, dict) and "answer" in wrapper:
            actual_answer = wrapper["answer"]
            conversation_id = wrapper.get("conversation_id")
    except (json.JSONDecodeError, TypeError):
        pass

    # 인증 만료 감직 → 자동 재인증 후 1회 재시도 (기존 로직 유지)
    if _is_auth_error(actual_answer) and _retry:
        print(f"[AUTH] 인증 만료 응답 감지: {actual_answer[:80]}")
        reauthed = _try_auto_reauth()
        if reauthed:
            return _call_notebook_query_sync(query, _retry=False, notebook_id=notebook_id)
        else:
            return {"answer": "인증 만료. 자동 복구 실패.", "success": False, "auth_expired": True}

    final_resp = {"answer": actual_answer, "success": True}
    if conversation_id:
        final_resp["conversation_id"] = conversation_id
    return final_resp


# ──────────────────────────────────────────────
# 캐시 레이어 (메모리 + 디스크 통합)
# ──────────────────────────────────────────────
def _get_ttl(key: str) -> int:
    """캐시 키에 맞는 TTL을 반환합니다."""
    for policy_key, ttl in CACHE_TTL_POLICIES.items():
        if policy_key in key:
            return ttl
    return DEFAULT_TTL


def _is_cache_valid(key: str) -> bool:
    if key not in _cache:
        return False
    ttl = _get_ttl(key)
    return (time.time() - _cache[key]["ts"]) < ttl


def _is_cache_stale(key: str) -> bool:
    if key not in _cache:
        return True
    ttl = _get_ttl(key)
    stale_after = ttl * STALE_RATIO
    return (time.time() - _cache[key]["ts"]) > stale_after


def get_cached(key: str) -> Optional[dict]:
    """메모리 캐시에서 유효한 데이터를 찾습니다."""
    if _is_cache_valid(key):
        return _cache[key]["data"]

    # 메모리에 없거나 만료 → 디스크 확인
    disk = _load_from_disk(key)
    if disk:
        ts = disk["ts"]
        ttl = _get_ttl(key)
        if (time.time() - ts) < ttl:
            _cache[key] = {"data": disk["data"], "ts": ts}
            print(f"[CACHE] 디스크에서 복원: {key}")
            return disk["data"]
        else:
            # TTL 만료됐지만 데이터는 있음 → stale data로 반환 가능
            # 메모리에 로드해두고 백그라운드 갱신은 호출부에서 처리
            _cache[key] = {"data": disk["data"], "ts": ts}
            return disk["data"]

    return None


def set_cache(key: str, data: dict):
    """메모리 + 디스크 양쪽에 캐시를 저장합니다."""
    ts = time.time()
    _cache[key] = {"data": data, "ts": ts}
    # 비동기적으로 디스크에도 저장
    threading.Thread(
        target=_save_to_disk,
        args=(key, data, ts),
        daemon=True
    ).start()


async def _background_refresh(key: str, query: str, notebook_id: Optional[str] = None):
    """백그라운드에서 캐시를 갱신합니다. (중복 실행 완전 방지)"""
    # 이미 갱신 중이거나 프리로딩 중이면 완전히 건너뜀
    if _refresh_lock.get(key) or key in _preloading_keys:
        print(f"[CACHE] 백그라운드 갱신 스킵 (이미 진행 중): {key}")
        return
    _refresh_lock[key] = True
    try:
        print(f"[CACHE] 백그라운드 갱신 시작: {key}")
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_executor, _call_notebook_query_sync, query, True, notebook_id)
        if result.get("success"):
            set_cache(key, result)
            print(f"[CACHE] 백그라운드 갱신 완료: {key}")
        else:
            print(f"[CACHE] 백그라운드 갱신 실패 (MCP 오류): {key}")
    except Exception as e:
        print(f"[CACHE] 갱신 예외: {key}: {e}")
    finally:
        _refresh_lock[key] = False


async def query_notebook(
    query: str,
    cache_key: str = "",
    conversation_id: Optional[str] = None,
    force: bool = False,
    notebook_id: Optional[str] = None,
) -> dict:
    """
    캐싱 레이어가 포함된 NotebookLM 질의 (비동기 진입점).
    - force=True: 캐시 무시, MCP에 즉시 재질의 (수동 새로고침)
    - 캐시 HIT (신선): 즉시 반환
    - 캐시 HIT (오래됨, TTL 70% 경과): 즉시 반환 + 백그라운드 갱신 (중복 방지)
    - 캐시 MISS: ThreadPoolExecutor에서 동기 MCP 호출
    """
    key = cache_key or query[:60]

    # 강제 새로고침: 메모리/디스크 캐시 모두 삭제 후 재질의
    if force:
        print(f"[CACHE] 강제 새로고침 — 캐시 무효화: {key}")
        _cache.pop(key, None)
        fpath = _cache_file_path(key)
        if fpath.exists():
            try:
                fpath.unlink()
            except Exception:
                pass
        # 이미 갱신 중이면 완료 대기 후 재질의
        if _refresh_lock.get(key):
            print(f"[CACHE] 갱신 중인 키 재질의 대기: {key}")

    cached = get_cached(key)
    if cached and not force:
        # 프리로딩/갱신 중이 아니고, 오래된 경우에만 백그라운드 갱신 트리거
        if _is_cache_stale(key) and not _refresh_lock.get(key) and key not in _preloading_keys:
            asyncio.create_task(_background_refresh(key, query, notebook_id))
        cached["_from_cache"] = True
        return cached

    # 캐시 없음 또는 force — 직접 질의
    loop = asyncio.get_event_loop()

    async def _do_query_and_cache():
        # 쓰레드풀에서 동기함수 실행 (무한 대기)
        res = await loop.run_in_executor(_executor, _call_notebook_query_sync, query, True, notebook_id)
        if res and res.get("success"):
            set_cache(key, res)
        return res

    try:
        # 클라이언트 연결 종료 시(CancelledError)에도 쿼리가 끝까지 실행되어 캐시가 저장되도록 보장
        task = asyncio.create_task(_do_query_and_cache())
        result = await asyncio.shield(task)
    except asyncio.CancelledError:
        print(f"[MCP] 사용자가 요청을 취소했지만 (키: {key[:30]}), 백그라운드에서 캐싱을 계속 진행합니다.")
        raise
    except Exception as e:
        import traceback
        trace_str = traceback.format_exc()
        print(f"[MCP] 쿼리 실행 중 예외 (키: {key[:30]}): {e}\n{trace_str}")
        global _mcp_proc, _initialized
        with _mcp_lock:
            if _mcp_proc and _mcp_proc.poll() is None:
                _mcp_proc.kill()
            _mcp_proc = None
            _initialized = False
        return {"answer": f"서버 응답 오류가 발생했습니다. 에러: {str(e)}", "success": False, "trace": trace_str}

    return result or {"answer": "알 수 없는 오류 발생", "success": False}


# ──────────────────────────────────────────────
# 프리로딩 (서버 시작 시 8개 엔드포인트 자동 질의)
# ──────────────────────────────────────────────
# 각 라우터의 쿼리를 import 없이 여기서 등록하여 순환 참조 방지
PRELOAD_QUERIES: dict[str, str] = {}


def register_preload_query(key: str, query: str):
    """라우터가 서버 시작 시 호출하여 프리로딩 대상을 등록합니다."""
    PRELOAD_QUERIES[key] = query


async def preload_all_caches():
    """
    등록된 모든 쿼리를 백그라운드에서 순차적으로 실행합니다.
    - 이미 유효한 디스크 캐시가 있는 항목은 건너뜁니다.
    - 프리로딩 중에는 _preloading_keys에 등록하여 중복 백그라운드 갱신을 차단합니다.
    """
    if not PRELOAD_QUERIES:
        print("[PRELOAD] 등록된 프리로딩 쿼리 없음")
        return

    print(f"[PRELOAD] {len(PRELOAD_QUERIES)}개 엔드포인트 프리로딩 시작...")

    skipped = 0
    loaded = 0
    for key, query in PRELOAD_QUERIES.items():
        # 유효한 캐시 있으면 스킵
        existing = get_cached(key)
        if existing and _is_cache_valid(key):
            skipped += 1
            print(f"[PRELOAD] ↩ {key} (캐시 유효, 스킵)")
            continue

        # 프리로딩 중 표시 → 백그라운드 갱신 중복 차단
        _preloading_keys.add(key)
        try:
            loop = asyncio.get_event_loop()
            # 타임아웃(None) 없이 무한 대기. 안정적인 프리로딩 보장.
            result = await loop.run_in_executor(_executor, _call_notebook_query_sync, query)
            if result and result.get("success"):
                set_cache(key, result)
                loaded += 1
                print(f"[PRELOAD] ✓ {key} ({len(result.get('answer',''))}자)")
            else:
                answer_err = result.get("answer", "") if result else "None"
                print(f"[PRELOAD] ✗ {key}: {answer_err[:80]}")
        except Exception as e:
            print(f"[PRELOAD] 쿼리 실행 실패! {key} - {e}")
            with _mcp_lock:
                if _mcp_proc and _mcp_proc.poll() is None:
                    _mcp_proc.kill()
                _mcp_proc = None
                _initialized = False
        except Exception as e:
            print(f"[PRELOAD] ✗ {key}: {e}")
        finally:
            # 프리로딩 완료 표시 해제
            _preloading_keys.discard(key)

    print(f"[PRELOAD] 완료 — 새로 로드: {loaded}, 캐시 사용: {skipped}")


def get_all_cache_status() -> dict:
    """캐시 상태 반환 (디버깅용)"""
    now = time.time()
    status = {}
    for k, v in _cache.items():
        age = int(now - v["ts"])
        ttl = _get_ttl(k)
        status[k] = {
            "age_seconds": age,
            "ttl_seconds": ttl,
            "valid": age < ttl,
            "stale": age > (ttl * STALE_RATIO),
            "disk_backed": _cache_file_path(k).exists(),
        }
    return status


def _kill_process_tree(pid: int):
    """Windows에서 프로세스 트리 전체를 종료합니다."""
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                capture_output=True,
                timeout=10,
            )
        except Exception as e:
            print(f"[MCP] taskkill 실패: {e}")


def shutdown_mcp_sync():
    """MCP 서버 프로세스를 종료합니다 (동기). Graceful → Force 순서."""
    global _mcp_proc, _initialized
    with _mcp_lock:
        if _mcp_proc and _mcp_proc.poll() is None:
            pid = _mcp_proc.pid
            print(f"[MCP] 서버 종료 시작 (PID={pid})...")
            try:
                # 1단계: Graceful terminate
                _mcp_proc.terminate()
                try:
                    _mcp_proc.wait(timeout=5)
                    print("[MCP] Graceful 종료 성공")
                except subprocess.TimeoutExpired:
                    # 2단계: Force kill
                    print("[MCP] Graceful 종료 실패, 강제 종료...")
                    _mcp_proc.kill()
                    try:
                        _mcp_proc.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        pass
                    # 3단계: Windows 프로세스 트리 정리
                    _kill_process_tree(pid)
            except Exception as e:
                print(f"[MCP] 종료 중 오류: {e}")
                # 최후 수단
                _kill_process_tree(pid)
            finally:
                _mcp_proc = None
                _initialized = False
            print("[MCP] 서버 종료 완료")


async def shutdown_mcp():
    """MCP 서버 종료 (비동기 래퍼)."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, shutdown_mcp_sync)

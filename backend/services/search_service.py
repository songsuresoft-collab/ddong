import httpx
import os
import json
import asyncio
import time
import subprocess
import sys
import re
from services.mcp_client import query_notebook, NotebookLMClient # MCP 클라이언트 기능 활용
from dotenv import load_dotenv

def log_sync_debug(message: str):
    try:
        log_path = os.path.join(os.getcwd(), "sync_debug.log")
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] [SEARCH-SVC] {message}\n")
    except:
        pass

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# 사용자 지정 컨퍼런스 전용 Notebook ID
CONFERENCE_NOTEBOOK_ID = "f5b8549a-a90e-41be-a2e2-efdb4449c201"

async def clear_notebook_sources(notebook_id: str):
    """지정된 노트북의 모든 소스를 영구 삭제합니다 (비동기 처리 최적화)."""
    print(f"[CLEANUP] Cleaning all sources in notebook: {notebook_id}")
    
    try:
        # 1. venv 경로 계산
        venv_scripts = os.path.dirname(sys.executable)
        nlm_exe = os.path.join(venv_scripts, "nlm.exe" if sys.platform == "win32" else "nlm")
        if not os.path.exists(nlm_exe):
            nlm_exe = "nlm"

        # 2. 소스 ID 목록 조회 (Quiet 모드)
        list_cmd = [nlm_exe, "source", "list", "-q", notebook_id]
        
        # 쉘 환경의 특수한 오류 방지를 위해 비동기 서브프로세스 권장하지만 
        # 안정성을 위해 우선 run으로 하되 타임아웃 15초를 겁니다.
        proc = subprocess.run(list_cmd, capture_output=True, text=True, timeout=15.0)
        
        if proc.returncode != 0:
            print(f"[CLEANUP-WARN] nlm list command failed or timed out: {proc.stderr}")
            return False

        source_ids = proc.stdout.strip().splitlines()

        if not source_ids:
            print("[CLEANUP] No sources found. Already clean.")
            return True

        print(f"[CLEANUP] Found {len(source_ids)} sources. Deleting...")

        # 3. 소스 대량 삭제 (10개씩 끊어서 처리 - 대용량 방지)
        chunk_size = 10
        for i in range(0, len(source_ids), chunk_size):
            chunk = source_ids[i:i + chunk_size]
            delete_cmd = [nlm_exe, "source", "delete", "--confirm"] + chunk
            subprocess.run(delete_cmd, capture_output=True, text=True, timeout=20.0)
            print(f"[CLEANUP] Deleted chunk {i // chunk_size + 1}")
        
        print("[CLEANUP] Successfully cleared all sources.")
        return True
    except Exception as e:
        print(f"[CLEANUP-ERROR] Failed to clear sources: {e}")
        return False


async def search_and_structure_conferences():
    """
    통합 검색어로 인터넷 리서치를 수행하여 타임아웃을 방지하고 데이터를 구조화합니다.
    """
    print(f"[CONFERENCE] Task Started. Target Notebook: {CONFERENCE_NOTEBOOK_ID}")
    
    # 1. 국내/해외 통합 검색어 정의
    combined_query = "SDV (Software Defined Vehicle), AI (Artificial Intelligence), MATLAB, Control Systems, Automotive Tech에 대한 국내 및 해외 글로벌 컨퍼런스, 행사들의 공식 홈페이지"
    
    mcp = NotebookLMClient()
    
    try:
        # [STEP 1] 인터넷 리서치 시작
        print(f"[CONFERENCE-1] Researching Internet for: {combined_query}")
        start_result = await mcp.call_tool("research_start", {
            "query": combined_query,
            "source": "web",
            "mode": "fast",
            "notebook_id": CONFERENCE_NOTEBOOK_ID
        })
        
        if not start_result.get("success"):
            print(f"[CONFERENCE-ERROR] Failed to start research: {start_result}")
            return {"success": False, "error": "NotebookLM Research Start Failed"}

        # Task ID 추출 (JSON, 텍스트, 또는 정규식 기반)
        task_id = start_result.get("task_id")
        answer_raw = start_result.get("answer", "")
        
        # 디버깅 로그 추가
        if not task_id:
            msg = f"!!! Task ID missing. Raw Answer: {answer_raw}"
            print(f"[CONFERENCE-DEBUG] {msg}")
            log_sync_debug(msg)

        if not task_id and answer_raw:
            # 1. JSON 형태 추출 시도
            try:
                if "{" in answer_raw:
                    import json
                    s_idx = answer_raw.find("{")
                    e_idx = answer_raw.rfind("}") + 1
                    json_str = answer_raw[s_idx:e_idx]
                    parsed = json.loads(json_str)
                    task_id = parsed.get("task_id") or parsed.get("taskId")
            except:
                pass
            
            # 2. 정규식 기반 추출 (ID: [uuid], task_id: [uuid], 또는 task-xxx)
            if not task_id:
                import re
                patterns = [
                    r"(?:task_id|taskId|ID):\s*([a-zA-Z0-9\-_]+)",
                    r"(task-[a-zA-Z0-9\-]+)",
                    r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"
                ]
                for p in patterns:
                    m = re.search(p, answer_raw, re.IGNORECASE)
                    if m:
                        task_id = m.group(1) if m.groups() else m.group(0)
                        break
                
        if not task_id:
            print("[CONFERENCE-ERROR] Research task ID missing. Cannot proceed.")
            return {"success": False, "error": "Research task ID is missing."}

        print(f"[CONFERENCE-2] Research Task {task_id} Active. Monitoring progress...")

        # [STEP 2] 리서치 완료 폴링 (최대 60초)
        is_completed = False
        start_time = time.time()
        
        while time.time() - start_time < 60:
            status_resp = await mcp.call_tool("research_status", {
                "notebook_id": CONFERENCE_NOTEBOOK_ID,
                "task_id": task_id,
                "max_wait": 0
            })
            
            # 상태 문자열 통합 판별 (정밀 필터링)
            # "success"는 MCP 호출 자체의 성공을 의미할 수 있으므로 제외합니다.
            raw_text = str(status_resp).lower()
            ans_text = status_resp.get("answer", "").lower()
            
            # "completed", "finished", "완료" 등의 명확한 종료 신호 확인
            if "completed" in raw_text or "finished" in raw_text or "완료" in ans_text or "완료" in raw_text:
                print("[CONFERENCE-3] Research Done (Signal Detected). Importing web sources...")
                import_res = await mcp.call_tool("research_import", {
                    "notebook_id": CONFERENCE_NOTEBOOK_ID,
                    "task_id": task_id
                })
                
                if import_res.get("success"):
                    print("[CONFERENCE-3-OK] Successfully imported web sources to notebook.")
                    is_completed = True
                else:
                    print(f"[CONFERENCE-3-WARN] Import call failed: {import_res}")
                    # 실패 시 한 번 더 루프를 돌며 상태를 보거나 에러 처리
                break
            
            print(f"[CONFERENCE-WAIT] Researching... ({int(time.time() - start_time)}s)")
            await asyncio.sleep(7)
        
        if not is_completed:
            print("[CONFERENCE-ERROR] Research timed out. Sources were not imported.")
            return {"success": False, "error": "웹 리서치 시간이 초과되었습니다 (60초 초과)."}

        # [STEP 3] 최종 데이터 추출
        print("[CONFERENCE-4] Analyzing and Organizing Conference Data...")
        
        prompt = """
        2026년~2027년에 개최 예정인 글로벌 및 국내 주요 테크/자동차/AI 컨퍼런스 정보를 아래 JSON 리스트 형식으로 정리해줘.
        
        **중요 규칙**:
        1. 답변 내에 [1], [2], [5]와 같은 출처 번호나 각주 기호를 절대 포함하지 마. 모든 텍스트는 순수한 글자로만 작성해.
        2. 날짜는 YYYY.MM.DD 형식으로 작성해. (예: 2026.05.20)
        3. 각 항목은 다음 필드를 포함해야 해:
          {
            "region": "Domestic (Korea) 또는 International",
            "name": "컨퍼런스 풀네임",
            "keywords": "주요 기술 키워드 (쉼표 구분)",
            "date": "개최 날짜",
            "location": "개최 도시 및 장소"
          }
        추가적인 설명 없이 JSON만 출력해.
        """
        
        query_result = await query_notebook(
            query=prompt,
            cache_key=f"sync_{int(time.time())}",
            force=True,
            notebook_id=CONFERENCE_NOTEBOOK_ID
        )
        
        if query_result["success"]:
            # JSON 텍스트 파싱 시도
            raw_ans = query_result["answer"]
            try:
                if "```json" in raw_ans:
                    raw_ans = raw_ans.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_ans:
                    raw_ans = raw_ans.split("```")[1].split("```")[0].strip()
                
                structured_data = json.loads(raw_ans)
                print(f"[CONFERENCE-SUCCESS] Found {len(structured_data)} upcoming conferences.")
                return {"success": True, "data": structured_data}
            except Exception as e:
                print(f"[CONFERENCE-ERROR] Data extraction/parsing failed: {e}")
                return {"success": False, "error": "데이터 추출 및 파싱 실패"}
        else:
            return {"success": False, "error": query_result.get("error", "분석 실패")}
            
    except Exception as e:
        print(f"[CONFERENCE-ERROR] {e}")
        return {"success": False, "error": str(e)}

import httpx
import json
import os
import time
import traceback
from fastapi import APIRouter, Query, Body, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel
from services.mcp_client import query_notebook
from services.search_service import search_and_structure_conferences, clear_notebook_sources, CONFERENCE_NOTEBOOK_ID
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# 로그 기록 보조 함수
def log_sync_debug(message: str):
    try:
        log_path = os.path.join(os.getcwd(), "sync_debug.log")
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {message}\n")
    except:
        pass

# 환경 변수 로드
ONBOARDING_NOTEBOOK_ID = "2d4b0ec8-fdc4-4655-af25-b33a94d92d2b"
EDUCATION_SCRIPT_URL = os.getenv("EDUCATION_SCRIPT_URL")
CONFERENCE_SCRIPT_URL = os.getenv("CONFERENCE_SCRIPT_URL")

class EducationItem(BaseModel):
    title: str
    date: str
    instructor: str
    tag: str

@router.get("/onboarding/guide")
async def get_onboarding_guide(question: str = Query(None), force: bool = False):
    """온보딩 가이드 정보를 NotebookLM에서 가져옵니다. 질문이 있으면 질문에 답합니다."""
    cache_key = "onboarding_guide"
    
    # 질문이 없으면 기본 요약 프롬프트, 질문이 있으면 해당 질문 사용
    if question:
        prompt = question
        # 질문마다 다른 결과를 위해 캐시 키를 고유화 (질문 내용 포함)
        cache_key = f"guide_q_{hash(question) % 10000}"
    else:
        prompt = "신입 사원 온보딩에 필요한 핵심 지침과 절차를 상세히 요약해서 제공해줘."
    
    result = await query_notebook(
        query=prompt,
        cache_key=cache_key,
        force=force,
        notebook_id=ONBOARDING_NOTEBOOK_ID
    )
    return result

@router.get("/onboarding/status")
async def get_onboarding_status():
    """부서원 전체 온보딩 현황 데이터를 반환합니다 (Mock)."""
    return {
        "members": [
            {"id": "m1", "name": "김철수", "team": "SDV개발팀", "progress": 85},
            {"id": "m2", "name": "이영희", "team": "AI인텔리전스", "progress": 40},
            {"id": "m3", "name": "박지민", "team": "시스템검증", "progress": 10},
        ],
        "success": True
    }

@router.get("/onboarding/guide/recommendations")
async def get_guide_recommendations(force: bool = Query(False)):
    """NotebookLM에서 문서 분석 기반 추천 질문 5가지를 생성합니다."""
    prompt = "이 문서들을 분석해서 신입 사원이 가장 궁금해할 만한 핵심 질문 5가지를 '질문1, 질문2, 질문3, 질문4, 질문5' 형식으로 아주 짧고 명확하게 제안해줘. 따옴표나 숫자는 빼고 쉼표로만 구분해."
    
    try:
        result = await query_notebook(
            query=prompt,
            cache_key="guide_recommendations",
            notebook_id=ONBOARDING_NOTEBOOK_ID,
            force=force
        )
        if result.get("success"):
            import re
            raw_questions = result.get("answer", "")
            
            # 1. 인용구 제거 ([1], [1, 2] 등)
            cleaned = re.sub(r'\[\d+(?:,\s*\d+)*\]', '', raw_questions)
            
            # 2. 불필요한 기호(*, ", ', -) 제거 및 줄바꿈을 공백으로 변경
            cleaned = cleaned.replace("*", "").replace('"', "").replace("'", "").replace("\n", " ").strip()
            
            # 3. 쉼표 기준으로 분리
            questions = [q.strip() for q in cleaned.split(',') if q.strip()]
            
            # 4. 만약 쉼표 분리가 잘 안 된 경우 (번호 매기기 등) 추가 처리
            if len(questions) < 2:
                # 1. 2. 3. 또는 - 형식으로 분리 시도
                questions = [q.strip() for q in re.split(r'\d+\.|\-', cleaned) if q.strip()]

            # 상위 5개 선택
            final_questions = questions[:5]
            
            if not final_questions:
                final_questions = ["SDV실의 주요 업무", "신입 교육 기간", "사내 복지 혜택", "출퇴근 셔틀 이용", "사내 식당 메뉴"]
                
            return {"success": True, "recommendations": final_questions}
    except Exception as e:
        print(f"[RECO-ERROR] {e}")
        
    return {"success": False, "recommendations": ["SDV실의 주요 업무", "신입 교육 기간", "사내 복지 혜택"]}

# ──────────────────────────────────────────────
# 사내 교육 (Education)
# ──────────────────────────────────────────────

@router.get("/onboarding/education")
async def get_education_list():
    """구글 시트에서 사내 교육(Education) 목록을 가져옵니다."""
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(f"{EDUCATION_SCRIPT_URL}?action=read", timeout=15.0)
            if response.status_code == 200:
                data = response.json()
                return {"education": data, "success": True}
            else:
                return {"education": [], "success": False, "error": f"Education Sheet API Error: {response.status_code}"}
    except Exception as e:
        print(f"[EDUCATION] Error reading: {e}")
        return {"education": [], "success": False, "error": str(e)}

@router.post("/onboarding/education")
async def add_education_item(item: EducationItem):
    """사내 교육 항목을 추가합니다."""
    generated_id = int(time.time() * 1000)
    payload = {
        "action": "add",
        "id": generated_id,
        "title": item.title,
        "date": item.date,
        "instructor": item.instructor,
        "tag": item.tag
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=25.0) as client:
            response = await client.post(EDUCATION_SCRIPT_URL, json=payload)
            if response.status_code == 200:
                return {"success": True, "id": generated_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=500, detail="Insertion failed")

@router.delete("/onboarding/education/{item_id}")
async def delete_education_item(item_id: str):
    """사내 교육 항목을 삭제합니다."""
    try:
        payload = {"action": "delete", "id": item_id}
        async with httpx.AsyncClient(follow_redirects=True, timeout=25.0) as client:
            response = await client.post(EDUCATION_SCRIPT_URL, json=payload)
            if response.status_code == 200:
                return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=500, detail="Delete failed")

# ──────────────────────────────────────────────
# 컨퍼런스 (Conference)
# ──────────────────────────────────────────────

@router.get("/onboarding/conference")
async def get_conference_list():
    """구글 시트(Conference_List 탭)에서 실시간 컨퍼런스 정보를 가져옵니다."""
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            url = f"{CONFERENCE_SCRIPT_URL}?action=read"
            response = await client.get(url, timeout=15.0)
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                if "application/json" in content_type:
                    data = response.json()
                    return {"conferences": data, "success": True}
                else:
                    return {"conferences": [], "success": False, "error": f"Invalid API Content"}
            else:
                return {"conferences": [], "success": False, "error": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"conferences": [], "success": False, "error": str(e)}

@router.post("/onboarding/conference/sync")
async def sync_conference_from_web():
    """웹에서 정보를 검색-구조화-시트기록의 전 과정을 수행합니다."""
    try:
        log_sync_debug(">>> Sync Pipeline Started")
        
        # 0. 이전 소스 완전 초기화 (Hard Reset)
        log_sync_debug("Step 0: Clearing Notebook Sources...")
        await clear_notebook_sources(CONFERENCE_NOTEBOOK_ID)
        
        # 1. Tavily 검색 + NotebookLM 구조화
        log_sync_debug("Step 1: Web Research & AI Analysis Start...")
        search_result = await search_and_structure_conferences()
        
        if not search_result["success"]:
            err_msg = search_result.get("error", "Unknown Search Error")
            log_sync_debug(f"!!! Step 1 FAILED: {err_msg}")
            return {"success": False, "error": err_msg}
        
        structured_data = search_result["data"]
        log_sync_debug(f"Step 1 Success: Extracted {len(structured_data)} items")
        
        # 2. 구글 시트에 데이터 전송
        try:
            log_sync_debug("Step 2: Sending data to Google Sheet script...")
            if not CONFERENCE_SCRIPT_URL:
                log_sync_debug("!!! SCRIPT URL MISSING")
                return {"success": False, "error": "시트 URL이 설정되지 않았습니다."}

            payload = {
                "action": "sync",
                "data": structured_data
            }
            
            async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
                response = await client.post(CONFERENCE_SCRIPT_URL, json=payload)
                resp_text = response.text.strip()
                log_sync_debug(f"Step 2 Script Status: {response.status_code}")
                
                if response.status_code == 200 and ("Success" in resp_text or "application/json" in response.headers.get("content-type", "")):
                    log_sync_debug(">>> ALL SYNC PROCESS COMPLETED")
                    return {"success": True, "count": len(structured_data), "data": structured_data}
                else:
                    log_sync_debug(f"!!! Script Error Response: {resp_text[:100]}")
                    return {"success": False, "error": f"시트 연동 실패: {resp_text[:50]}"}
                    
        except Exception as e:
            log_sync_debug(f"!!! Step 2 Exception: {str(e)}")
            return {"success": False, "error": f"시트 전송 중 장애: {str(e)}"}
            
    except Exception as exc:
        err_detail = traceback.format_exc()
        log_sync_debug(f"!!! SERVER CRITICAL ERROR:\n{err_detail}")
        return {"success": False, "error": f"서버 내부 오류 발생: {str(exc)}"}

class ChatRequest(BaseModel):
    message: str

@router.post("/onboarding/conference/chat")
async def chat_with_conference_notebook(req: ChatRequest):
    """컨퍼런스 노트북의 소스를 바탕으로 AI와 대화합니다."""
    try:
        # 노트북에 질의 (컨퍼런스 전용 ID 사용)
        # 채팅이므로 매번 새로운 답변을 유도하기 위해 캐시 키에 타임스탬프를 섞거나 force=True 권장
        result = await query_notebook(
            query=req.message,
            cache_key=f"conf_chat_{int(time.time() / 60)}", # 1분 단위 캐시 (성능과 실시간성 절충)
            notebook_id=CONFERENCE_NOTEBOOK_ID,
            force=True
        )
        return result
    except Exception as e:
        print(f"[CONF-CHAT] Error: {e}")
        return {"success": False, "error": str(e)}

import json
import subprocess
import asyncio
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from services.mcp_client import query_notebook

router = APIRouter()

KNOWLEDGE_NOTEBOOK_ID = "d158823e-e7d7-4b96-97ef-173794f82ea5"

import re

@router.get("/knowledge-base/documents")
async def list_documents(force: bool = False):
    """지식 베이스 문서(소스) 리스트를 제공합니다."""
    try:
        import sys
        import os
        import subprocess
        
        nlm_bin = os.path.join(sys.prefix, 'Scripts', 'nlm.exe' if sys.platform == 'win32' else 'nlm')
        
        def _run_cmd():
            # 윈도우에서 UTF-8 출력을 강제하기 위해 chcp 65001 사용
            shell_cmd = f'chcp 65001 > nul && "{nlm_bin}" source list "{KNOWLEDGE_NOTEBOOK_ID}" --profile default --json'
            return subprocess.run(
                shell_cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
        process = await asyncio.get_event_loop().run_in_executor(None, _run_cmd)
        stdout, stderr = process.stdout, process.stderr
        
        if process.returncode == 0:
            # chcp 65001 이후에는 utf-8로 시도
            try:
                stdout_str = stdout.decode('utf-8')
            except Exception:
                stdout_str = stdout.decode('cp949', errors='replace')
                
            data = json.loads(stdout_str)
            sources = [{"id": doc.get("id", f"doc_{i}"), "title": str(doc.get("title", ""))} for i, doc in enumerate(data)]
            return {"success": True, "sources": sources, "data": data}
        else:
            stderr_str = stderr.decode('cp949', errors='replace')
            raise Exception(f"Exit code: {process.returncode}, Stderr: {stderr_str}")
    except Exception as e:
        import traceback
        try:
            stdout_d = stdout.decode('cp949', errors='replace')
        except:
            stdout_d = 'None'
        try:
            stderr_d = stderr.decode('cp949', errors='replace')
        except:
            stderr_d = 'None'
        err_msg = f"{repr(e)} | STDOUT: {stdout_d} | STDERR: {stderr_d}"
        print(f"문서 목록 파싱 오류: {err_msg}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=err_msg)

@router.get("/knowledge-base/summary")
async def get_document_summary(doc_title: str = Query(...), force: bool = False):
    """특정 문서에 대한 요약 정보를 NotebookLM에 요청합니다."""
    cache_key = f"kb_summary_{doc_title}"
    
    clean_title = re.sub(r'\[.*?\]', '', doc_title)
    clean_title = re.sub(r'(?i)\.(pdf|pptx|docx|txt)$', '', clean_title).strip()
    prompt = f'노트북 소스 중 "{clean_title}" 관련 문서의 내용을 매우 상세하고 심층적으로 분석하여 요약해 줘. 주요 섹션별 핵심 요점을 구분하고, 전문적이고 체계적인 정보를 충분히 포함하여 정중하게 작성해 줄 것.'
    
    result = await query_notebook(
        query=prompt,
        cache_key=cache_key,
        force=True,  # 항상 캐시 무시하고 새로 가져옴
        notebook_id=KNOWLEDGE_NOTEBOOK_ID
    )
    
    if result.get("success"):
        answer = result.get("answer", "")
        answer = re.sub(r'\[\d[\d\s\-,]*\]', '', answer)
        answer = answer.replace('**', '')
        answer = re.sub(r'EXTREMELY IMPORTANT:[\s\S]*', '', answer)
        result["answer"] = answer.strip()
        
    return result


@router.get("/knowledge-base/quiz")
async def get_document_quiz(doc_title: str = Query(...), force: bool = False):
    """특정 문서에 대한 10개 퀴즈를 NotebookLM에 요청하여 생성합니다."""
    cache_key = f"kb_quiz_{doc_title}"
    
    clean_title = re.sub(r'\[.*?\]', '', doc_title)
    clean_title = re.sub(r'(?i)\.(pdf|pptx|docx|txt)$', '', clean_title).strip()
    prompt = f'노트북 소스 중 "{clean_title}" 관련 문서의 내용을 바탕으로 전문가 수준의 4지선다형 객관식 시험 문제 최대 10개를 내줘. 포맷은 반드시 아래와 같은 JSON 배열만 출력해, 추가 설명 필요 없고 형식만 줘: [{{"question": "문제", "options": ["보기1", "보기2", "보기3", "보기4"], "answer": 0}}]'
    
    result = await query_notebook(
        query=prompt,
        cache_key=cache_key,
        force=True,  # 항상 캐시 무시하고 새로 가져옴
        notebook_id=KNOWLEDGE_NOTEBOOK_ID
    )
    
    if result.get("success"):
        answer = result.get("answer", "")
        json_match = re.search(r'\[[\s\S]*\]', answer)
        
        if json_match:
            try:
                parsed_data = json.loads(json_match.group(0))
                formatted_quiz = ""
                for i, q in enumerate(parsed_data):
                    formatted_quiz += f"Q{i+1}. {q.get('question', '')}\n"
                    for j, opt in enumerate(q.get('options', [])):
                        formatted_quiz += f"  {chr(65+j)}. {opt}\n"
                    formatted_quiz += f"정답: {chr(65 + q.get('answer', 0))}\n\n"
                
                # 프론트엔드 인터랙티브 기능을 위해 포맷팅된 문자열이 아닌 원본 JSON 데이터를 반환
                # result["answer"] = formatted_quiz.strip() # 기존 단순 텍스트 방식 방어용으로 주석 처리하거나 무시
                result["data"] = parsed_data
            except Exception as e:
                print(f"Quiz JSON 파싱 에러: {e}")
                pass
                
    return result

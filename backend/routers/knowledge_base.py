import json
import subprocess
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from services.mcp_client import query_notebook

router = APIRouter()

KNOWLEDGE_NOTEBOOK_ID = "d158823e-e7d7-4b96-97ef-173794f82ea5"

import re

@router.get("/knowledge-base/documents")
async def list_documents(force: bool = False):
    """지식 베이스 문서(소스) 리스트를 제공합니다."""
    cache_key = "kb_documents_list"
    prompt = "현재 등록된 모든 소스 문서 이름 리스트를 json 포맷으로 반환해줘. 양식: {\"source_documents\": [\"문서이름1\", \"문서이름2\"]}"
    
    result = await query_notebook(
        query=prompt,
        cache_key=cache_key,
        force=force,
        notebook_id=KNOWLEDGE_NOTEBOOK_ID
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="문서 목록을 불러오는 데 실패했습니다.")
    
    answer = result.get("answer", "")
    sources = []
    try:
        # JSON 블록 추출 시도
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', answer, re.DOTALL)
        json_str = match.group(1) if match else answer
        
        # 앞뒤 불필요한 텍스트 제거하고 JSON 파싱
        # 간혹 앞부분에 텍스트가 섞여있을 수 있으므로 {...} 또는 [...] 형태로 자름
        start_idx = json_str.find('{')
        if start_idx == -1: start_idx = json_str.find('[')
        end_idx = json_str.rfind('}')
        if end_idx == -1: end_idx = json_str.rfind(']')
            
        if start_idx != -1 and end_idx != -1:
            json_str = json_str[start_idx:end_idx+1]
            data = json.loads(json_str)
            
            doc_list = data.get("source_documents", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            sources = [{"id": f"doc_{i}", "title": str(name)} for i, name in enumerate(doc_list)]
    except Exception as e:
        print(f"문서 목록 파싱 오류: {e}")
        # 폴백: 불릿 포인트 파싱
        for i, line in enumerate(answer.split('\n')):
            line = line.strip()
            if line.startswith("- ") or line.startswith("* "):
                name = line[2:].strip()
                # 파일 확장자 또는 이름 형태인 경우만
                if len(name) > 2:
                    sources.append({"id": f"fallback_{i}", "title": name})

    # 여전히 비어있다면, 원본 데이터를 id1 이름으로 하나라도 담아 반환 (디버깅용)
    if not sources and len(answer) > 10:
        sources.append({"id": "raw_1", "title": "문서 목록 형태 인지 오류 (클릭하여 테스트)"})

    return {"success": True, "sources": sources}


@router.get("/knowledge-base/summary")
async def get_document_summary(doc_title: str = Query(...), force: bool = False):
    """특정 문서에 대한 요약 정보를 NotebookLM에 요청합니다."""
    cache_key = f"kb_summary_{doc_title}"
    prompt = f"'{doc_title}' 문서의 내용만을 상세히 분석하고 가장 중요한 핵심 내용을 3단락으로 요약해줘."
    
    result = await query_notebook(
        query=prompt,
        cache_key=cache_key,
        force=force,
        notebook_id=KNOWLEDGE_NOTEBOOK_ID
    )
    return result


@router.get("/knowledge-base/quiz")
async def get_document_quiz(doc_title: str = Query(...), force: bool = False):
    """특정 문서에 대한 10개 퀴즈를 NotebookLM에 요청하여 생성합니다."""
    cache_key = f"kb_quiz_{doc_title}"
    prompt = (
        f"'{doc_title}' 문서의 내용만을 바탕으로 관련된 퀴즈 10문제를 생성해줘.\n"
        "각 문제는 '문제 내용', '보기(4지선다형)', '정답', '해설'을 명확하게 구분해줘."
    )
    
    result = await query_notebook(
        query=prompt,
        cache_key=cache_key,
        force=force,
        notebook_id=KNOWLEDGE_NOTEBOOK_ID
    )
    return result

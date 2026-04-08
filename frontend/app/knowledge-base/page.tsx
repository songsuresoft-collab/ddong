'use client';
import React, { useState, useEffect } from 'react';

// 문서 타입 정의
interface DocumentSource {
  id: string;
  title: string;
}

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<DocumentSource[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentSource | null>(null);
  
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz'>('summary');
  
  const [summaryData, setSummaryData] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  const [quizData, setQuizData] = useState<string | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  
  const [docLoading, setDocLoading] = useState(true);
  
  // 최초: 문서 리스트 로드
  useEffect(() => {
    fetch('/api/knowledge-base/documents', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && data.sources) {
          setDocuments(data.sources);
          if (data.sources.length > 0) {
            setSelectedDoc(data.sources[0]);
          }
        }
      })
      .catch(err => console.error("Failed to fetch documents", err))
      .finally(() => setDocLoading(false));
  }, []);

  // 선택된 문서변경 시: 요약 및 퀴즈 초기화 및 요약 조회
  useEffect(() => {
    if (!selectedDoc) return;
    
    // 상태 초기화
    setSummaryData(null);
    setQuizData(null);
    setSummaryError(null);
    setQuizError(null);
    
    // 우선 요약 탭을 기본으로
    setActiveTab('summary');
    
    // 요약 데이터 가져오기
    setSummaryLoading(true);
    fetch(`/api/knowledge-base/summary?doc_title=${encodeURIComponent(selectedDoc.title)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSummaryData(data.answer);
        } else {
          setSummaryError(data.answer || "요약을 가져오는 중 오류가 발생했습니다.");
        }
      })
      .catch(err => setSummaryError("네트워크 오류가 발생했습니다."))
      .finally(() => setSummaryLoading(false));
      
  }, [selectedDoc]);

  // 퀴즈 탭을 클릭했을 때 (퀴즈 데이터가 없으면 로드)
  useEffect(() => {
    if (activeTab === 'quiz' && selectedDoc && !quizData && !quizLoading && !quizError) {
      setQuizLoading(true);
      fetch(`/api/knowledge-base/quiz?doc_title=${encodeURIComponent(selectedDoc.title)}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setQuizData(data.answer);
          } else {
            setQuizError(data.answer || "퀴즈를 생성하는 중 오류가 발생했습니다.");
          }
        })
        .catch(err => setQuizError("네트워크 오류가 발생했습니다."))
        .finally(() => setQuizLoading(false));
    }
  }, [activeTab, selectedDoc, quizData, quizLoading, quizError]);

  return (
    <main style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 64px)' }}>
      {/* 상단 헤더 영역 */}
      <section style={{
        background: 'linear-gradient(135deg, #030e44 0%, #1b2559 40%, #515b92 100%)',
        padding: '32px 36px', 
        borderRadius: '20px', 
        position: 'relative', 
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(3, 14, 68, 0.15)'
      }}>
        <h2 style={{ color: '#dee0ff', margin: 0, fontSize: '28px', fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>
          Intelligent Knowledge Base
        </h2>
        <p style={{ color: 'rgba(222,224,255,0.8)', margin: '12px 0 0', fontSize: '15px', lineHeight: 1.5 }}>
          NotebookLM AI의 심층 분석을 통해 주요 문서들의 인사이트를 요약하고, 맞춤형 퀴즈로 학습 내용을 점검하세요.
        </p>
      </section>

      {/* 메인 레이아웃 (왼쪽: 문서 리스트, 오른쪽: 분석 화면) */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flex: 1 }}>
        
        {/* 왼쪽 패널: 문서 리스트 */}
        <aside style={{ 
          width: '320px', 
          backgroundColor: '#fff', 
          borderRadius: '20px', 
          padding: '24px',
          boxShadow: '0 4px 20px rgba(3, 14, 68, 0.05)',
          border: '1px solid rgba(198, 197, 209, 0.2)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1b2559', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>
            NotebookLM Sources
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {docLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#767680', fontSize: '13px' }}>
                문서 목록을 불러오는 중...
              </div>
            ) : documents.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#767680', fontSize: '13px' }}>
                문서가 없습니다.
              </div>
            ) : (
              documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: isSelected ? 'rgba(67, 24, 255, 0.05)' : '#f8f9fc',
                      border: isSelected ? '1px solid rgba(67, 24, 255, 0.2)' : '1px solid transparent',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ 
                      color: isSelected ? '#4318FF' : '#a0aec0',
                      fontSize: '20px',
                      marginTop: '2px'
                    }}>
                      description
                    </span>
                    <span style={{ 
                      fontSize: '14px', 
                      color: isSelected ? '#1b2559' : '#4a5568',
                      fontWeight: isSelected ? 600 : 500,
                      lineHeight: 1.4,
                      wordBreak: 'break-all'
                    }}>
                      {doc.title}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* 오른쪽 패널: 탭 구조 (요약 / 퀴즈) */}
        <section style={{ 
          flex: 1, 
          backgroundColor: '#fff', 
          borderRadius: '20px', 
          boxShadow: '0 4px 20px rgba(3, 14, 68, 0.05)',
          border: '1px solid rgba(198, 197, 209, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '500px'
        }}>
          {selectedDoc ? (
            <>
              {/* 탭 네비게이션 */}
              <div style={{ 
                display: 'flex', 
                borderBottom: '1px solid #e2e8f0', 
                padding: '0 24px',
                gap: '32px'
              }}>
                <button
                  onClick={() => setActiveTab('summary')}
                  style={{
                    padding: '20px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'summary' ? '3px solid #4318FF' : '3px solid transparent',
                    color: activeTab === 'summary' ? '#4318FF' : '#718096',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>summarize</span>
                  AI 핵심 요약
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  style={{
                    padding: '20px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'quiz' ? '3px solid #4318FF' : '3px solid transparent',
                    color: activeTab === 'quiz' ? '#4318FF' : '#718096',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>quiz</span>
                  AI 생성 퀴즈
                </button>
              </div>

              {/* 컨텐츠 렌더링 영역 */}
              <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                {activeTab === 'summary' && (
                  <div>
                    {summaryLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4318FF', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ animation: 'spin 2s linear infinite' }}>autorenew</span>
                        NotebookLM이 문서의 핵심을 분석하고 있습니다...
                      </div>
                    ) : summaryError ? (
                      <div style={{ color: '#E53E3E', fontSize: '14px', backgroundColor: '#FFF5F5', padding: '16px', borderRadius: '8px' }}>
                        {summaryError}
                      </div>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap', color: '#2D3748', fontSize: '15px', lineHeight: 1.7 }}>
                        {summaryData}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'quiz' && (
                  <div>
                    {quizLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4318FF', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ animation: 'spin 2s linear infinite' }}>autorenew</span>
                         NotebookLM이 문서를 기반으로 10개의 고도화된 퀴즈를 생성하고 있습니다... (약 30초 소요)
                      </div>
                    ) : quizError ? (
                      <div style={{ color: '#E53E3E', fontSize: '14px', backgroundColor: '#FFF5F5', padding: '16px', borderRadius: '8px' }}>
                        {quizError}
                      </div>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap', color: '#2D3748', fontSize: '15px', lineHeight: 1.7 }}>
                        {quizData}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>menu_book</span>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>왼쪽 목록에서 문서를 선택하면 AI 분석이 시작됩니다.</p>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

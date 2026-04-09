'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 문서 타입 정의
interface DocumentSource {
  id: string;
  title: string;
}

// 퀴즈 문제 타입 정의
interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<DocumentSource[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentSource | null>(null);
  
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz'>('summary');
  
  // 요약 관련 상태
  const [summaryData, setSummaryData] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  // 퀴즈 관련 상태
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; total: number } | null>(null);
  
  const [docLoading, setDocLoading] = useState(true);

  // 애니메이션 상수
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };
  
  // 최초: 문서 리스트 로드
  useEffect(() => {
    fetch('/api/knowledge-base/documents', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && data.sources) {
          setDocuments(data.sources);
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
    setQuizQuestions(null);
    setQuizError(null);
    setSummaryError(null);
    setUserAnswers({});
    setQuizResult(null);
    
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

  // 퀴즈 생성 함수
  const fetchQuiz = () => {
    if (!selectedDoc) return;
    
    setQuizLoading(true);
    setQuizError(null);
    setQuizResult(null);
    setUserAnswers({});
    
    fetch(`/api/knowledge-base/quiz?doc_title=${encodeURIComponent(selectedDoc.title)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setQuizQuestions(data.data);
        } else {
          setQuizError(data.answer || "퀴즈를 생성하는 중 오류가 발생했습니다.");
        }
      })
      .catch(err => setQuizError("네트워크 오류가 발생했습니다."))
      .finally(() => setQuizLoading(false));
  };

  // 퀴즈 탭을 클릭했을 때
  useEffect(() => {
    if (activeTab === 'quiz' && selectedDoc && !quizQuestions && !quizLoading && !quizError) {
      fetchQuiz();
    }
  }, [activeTab]);

  // 퀴즈 채점 로직
  const submitQuiz = () => {
    if (!quizQuestions) return;
    let score = 0;
    quizQuestions.forEach((q, i) => {
      if (userAnswers[i] === q.answer) score++;
    });
    setQuizResult({ score, total: quizQuestions.length });
  };

  return (
    <main style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 64px)', backgroundColor: 'var(--background)' }}>
      
      {/* ──────────────── 헤더 영역 (시각적 강화) ──────────────── */}
      <section style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end',
        padding: '12px 4px 16px',
        borderBottom: '1px solid rgba(198,197,209,0.3)',
        marginBottom: '4px'
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            fontSize: '36px', 
            fontWeight: 900, 
            color: 'var(--primary)', 
            fontFamily: 'Manrope, sans-serif',
            letterSpacing: '-1.2px',
            lineHeight: 1.1
          }}>
            지식 베이스
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '16px', color: 'var(--on-surface-variant)', fontWeight: 600, opacity: 0.8 }}>
            문서 라이브러리 및 AI 인터랙티브 학습 센터
          </p>
        </div>
        
        <a 
          href="https://notebooklm.google.com/notebook/d158823e-e7d7-4b96-97ef-173794f82ea5"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: 'none',
            fontSize: '12px', 
            color: 'var(--primary)', 
            backgroundColor: 'var(--secondary-container)',
            padding: '8px 20px', 
            borderRadius: '9999px', 
            fontWeight: 800, 
            letterSpacing: '1px',
            boxShadow: '0 2px 8px rgba(3,14,68,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            border: '1px solid rgba(198,197,209,0.3)',
            transition: 'all 0.2sease-in-out'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
          NOTEBOOK LM 이동
        </a>
      </section>

      {/* ──────────────── 메인 레이아웃 ──────────────── */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flex: 1 }}>
        
        {/* 왼쪽 패널: 문서 리스트 */}
        <motion.aside 
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          style={{ 
            width: '320px', 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            padding: '24px',
            boxShadow: '0 2px 12px rgba(3,14,68,0.05)',
            border: '1px solid rgba(198,197,209,0.3)',
            height: 'fit-content'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>library_books</span>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--primary)', fontWeight: 700 }}>
              문서 라이브러리
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '650px', overflowY: 'auto' }}>
            {docLoading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--outline)' }}>
                <span className="material-symbols-outlined loading-spinner" style={{ fontSize: '24px', marginBottom: '8px' }}>sync</span>
                <p style={{ fontSize: '13px', margin: 0 }}>로딩 중...</p>
              </div>
            ) : documents.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--outline)', border: '1px dashed var(--outline-variant)', borderRadius: '12px' }}>
                <p style={{ fontSize: '13px', margin: 0 }}>문서가 없습니다.</p>
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
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: isSelected ? 'var(--primary-fixed)' : 'transparent',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary-fixed)' : 'rgba(198,197,209,0.2)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ 
                      fontSize: '18px', 
                      color: isSelected ? 'var(--primary)' : 'var(--outline)',
                      fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0"
                    }}>
                      {doc.title.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : doc.title.toLowerCase().endsWith('.pptx') ? 'slideshow' : 'description'}
                    </span>
                    <span style={{ 
                      fontSize: '13px', 
                      color: isSelected ? 'var(--primary)' : 'var(--on-surface)',
                      fontWeight: isSelected ? 700 : 500,
                      lineHeight: 1.4,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {doc.title}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </motion.aside>

        {/* 오른쪽 패널: 탭 구조 */}
        <motion.section 
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          style={{ 
            flex: 1, 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            boxShadow: '0 2px 12px rgba(3,14,68,0.05)',
            border: '1px solid rgba(198,197,209,0.3)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '720px',
            overflow: 'hidden'
          }}
        >
          {selectedDoc ? (
            <>
              {/* 탭 헤더 */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(198,197,209,0.2)' }}>
                <button
                  onClick={() => setActiveTab('summary')}
                  style={{
                    flex: 1, padding: '18px 0', cursor: 'pointer', border: 'none', background: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    color: activeTab === 'summary' ? 'var(--primary)' : 'var(--outline)',
                    fontWeight: activeTab === 'summary' ? 700 : 600, fontSize: '14px',
                    borderBottom: activeTab === 'summary' ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
                  AI 핵심 요약
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  style={{
                    flex: 1, padding: '18px 0', cursor: 'pointer', border: 'none', background: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    color: activeTab === 'quiz' ? 'var(--primary)' : 'var(--outline)',
                    fontWeight: activeTab === 'quiz' ? 700 : 600, fontSize: '14px',
                    borderBottom: activeTab === 'quiz' ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>quiz</span>
                  AI 마스터 퀴즈
                </button>
              </div>

              {/* 컨텐츠 영역 */}
              <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                <AnimatePresence mode="wait">
                  {activeTab === 'summary' && (
                    <motion.div
                      key="summary"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', color: 'var(--primary)', fontWeight: 800 }}>
                        {selectedDoc.title}
                      </h4>
                      
                      <div style={{ 
                        padding: '28px', backgroundColor: 'var(--surface-container-low)', 
                        borderRadius: '12px', border: '1px solid rgba(198,197,209,0.3)',
                        minHeight: '200px'
                      }}>
                        {summaryLoading ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: '16px' }}>
                            <span className="material-symbols-outlined loading-spinner" style={{ fontSize: '32px', color: 'var(--primary)' }}>sync</span>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--primary)', fontWeight: 600 }}>분석 중...</p>
                          </div>
                        ) : summaryError ? (
                          <div style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <span className="material-symbols-outlined">error</span>
                            {summaryError}
                          </div>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--on-surface)', fontSize: '15px', lineHeight: 1.8 }}>
                            {summaryData}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'quiz' && (
                    <motion.div
                      key="quiz"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {quizLoading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 0', gap: '20px' }}>
                          <span className="material-symbols-outlined loading-spinner" style={{ fontSize: '48px', color: 'var(--primary)' }}>psychology</span>
                          <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '16px', margin: '0 0 4px 0' }}>AI 퀴즈를 생성하고 있습니다</p>
                            <p style={{ color: 'var(--outline)', fontSize: '13px', margin: 0 }}>약 30~40초가 소요될 수 있습니다</p>
                          </div>
                        </div>
                      )}

                      {!quizLoading && quizError && (
                        <div style={{ textAlign: 'center', padding: '80px 0' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: '40px', marginBottom: '16px' }}>error</span>
                          <p style={{ color: 'var(--on-surface)', fontWeight: 600, marginBottom: '20px' }}>{quizError}</p>
                          <button onClick={fetchQuiz} style={{ 
                            padding: '10px 24px', backgroundColor: 'var(--primary)', color: '#fff', 
                            borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 
                          }}>다시 시도</button>
                        </div>
                      )}

                      {!quizLoading && quizResult && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                            <div style={{ 
                              width: '100px', height: '100px', backgroundColor: 'var(--secondary-container)', 
                              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              margin: '0 auto 20px' 
                            }}>
                              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '48px' }}>military_tech</span>
                            </div>
                            <h3 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary)', margin: '0 0 8px 0' }}>
                              {Math.round((quizResult.score / quizResult.total) * 100)}%
                            </h3>
                            <p style={{ color: 'var(--secondary)', fontSize: '16px', fontWeight: 600, margin: '0 0 32px 0' }}>
                               테스트 완료 ({quizResult.score} / {quizResult.total})
                            </p>
                          </motion.div>

                          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {quizQuestions?.map((q, idx) => {
                              const isCorrect = userAnswers[idx] === q.answer;
                              return (
                                <div key={idx} style={{ 
                                  padding: '16px 20px', borderRadius: '12px', border: '1px solid',
                                  backgroundColor: isCorrect ? 'var(--surface-container-low)' : 'var(--error-container)',
                                  borderColor: isCorrect ? 'rgba(5, 205, 153, 0.2)' : 'rgba(186, 26, 26, 0.2)',
                                  color: isCorrect ? 'var(--on-surface)' : 'var(--on-error-container)'
                                }}>
                                  <p style={{ fontWeight: 700, margin: '0 0 8px 0', fontSize: '14px' }}>Q{idx + 1}. {q.question}</p>
                                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', fontWeight: 500 }}>
                                    <span>내 답변: {q.options[userAnswers[idx]]}</span>
                                    {!isCorrect && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>정답: {q.options[q.answer]}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <button 
                            onClick={() => { setQuizResult(null); setUserAnswers({}); }} 
                            style={{ 
                              marginTop: '32px', padding: '12px 32px', backgroundColor: 'var(--surface-container)', 
                              color: 'var(--primary)', borderRadius: '10px', border: 'none', 
                              fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            다시 풀기
                          </button>
                        </div>
                      )}

                      {!quizLoading && !quizResult && quizQuestions && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                          {quizQuestions.map((q, qIdx) => (
                            <div key={qIdx}>
                              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '16px' }}>
                                <span style={{ opacity: 0.5, marginRight: '8px' }}>{qIdx + 1} / {quizQuestions.length}</span> {q.question}
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {q.options.map((opt, oIdx) => {
                                  const isSelected = userAnswers[qIdx] === oIdx;
                                  return (
                                    <button
                                      key={oIdx}
                                      onClick={() => setUserAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                      style={{
                                        textAlign: 'left', padding: '14px 18px', borderRadius: '10px', border: '1px solid',
                                        borderColor: isSelected ? 'var(--primary)' : 'rgba(198,197,209,0.3)',
                                        backgroundColor: isSelected ? 'var(--primary-fixed)' : '#fff',
                                        color: isSelected ? 'var(--primary)' : 'var(--on-surface)',
                                        fontWeight: isSelected ? 700 : 500, fontSize: '14px', cursor: 'pointer',
                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px'
                                      }}
                                    >
                                      <div style={{ 
                                        width: '20px', height: '20px', borderRadius: '50%', border: '1px solid',
                                        borderColor: isSelected ? 'var(--primary)' : 'var(--outline)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '11px', fontWeight: 800,
                                        backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                                        color: isSelected ? '#fff' : 'var(--outline)'
                                      }}>
                                        {oIdx + 1}
                                      </div>
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          
                          <div style={{ 
                            display: 'flex', justifyContent: 'flex-end', marginTop: '16px', 
                            paddingTop: '24px', borderTop: '1px solid rgba(198,197,209,0.2)'
                          }}>
                            <button
                              onClick={submitQuiz}
                              disabled={Object.keys(userAnswers).length < quizQuestions.length}
                              style={{ 
                                padding: '14px 40px', 
                                backgroundColor: Object.keys(userAnswers).length < quizQuestions.length ? 'var(--outline-variant)' : 'var(--primary)', 
                                color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 700, 
                                fontSize: '14px', cursor: Object.keys(userAnswers).length < quizQuestions.length ? 'not-allowed' : 'pointer'
                              }}
                            >
                              제출하여 채점하기
                            </button>
                          </div>
                        </div>
                      )}

                      {!quizLoading && !quizQuestions && !quizError && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '20px' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '56px', opacity: 0.5 }}>psychology</span>
                          <div style={{ textAlign: 'center' }}>
                            <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 6px 0' }}>AI 마스터리 테스트</h4>
                            <p style={{ color: 'var(--outline)', fontSize: '14px', margin: 0 }}>문서 학습 내용을 바탕으로 퀴즈를 생성합니다.</p>
                          </div>
                          <button 
                            onClick={fetchQuiz}
                            style={{ 
                              marginTop: '10px', padding: '14px 40px', backgroundColor: 'var(--primary)', 
                              color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            퀴즈 생성 시작
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1,
              backgroundColor: '#fafbff',
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(3,14,68,0.03) 0%, transparent 70%)',
              padding: '60px'
            }}>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
                style={{
                  width: '160px',
                  height: '160px',
                  backgroundColor: '#ffffff',
                  borderRadius: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 25px 50px rgba(3,14,68,0.06)',
                  marginBottom: '40px',
                  position: 'relative',
                  border: '1px solid rgba(198,197,209,0.2)'
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: '-10px',
                  borderRadius: '50px',
                  border: '2px dashed rgba(3,14,68,0.05)',
                  animation: 'spin 20s linear infinite'
                }} />
                <span className="material-symbols-outlined" style={{ 
                  fontSize: '72px', 
                  color: 'var(--primary)',
                  opacity: 0.9,
                  filter: 'drop-shadow(0 4px 12px rgba(3,14,68,0.1))'
                }}>
                  auto_stories
                </span>
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '-15px',
                  padding: '8px',
                  backgroundColor: 'var(--primary)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 10px 20px rgba(3,14,68,0.2)'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>tips_and_updates</span>
                </div>
              </motion.div>
              
              <h3 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '24px', 
                fontWeight: 900, 
                color: 'var(--primary)', 
                fontFamily: 'Manrope, sans-serif',
                letterSpacing: '-0.5px'
              }}>
                문서를 선택해주세요
              </h3>
              <p style={{ 
                margin: 0, 
                fontSize: '15px', 
                color: 'var(--on-surface-variant)', 
                fontWeight: 600,
                opacity: 0.7 
              }}>
                왼쪽 라이브러리에서 분석할 문서를 클릭하세요.
              </p>
              
              <div style={{ 
                marginTop: '40px',
                width: '60px', 
                height: '4px', 
                backgroundColor: 'var(--secondary-container)', 
                borderRadius: '2px'
              }} />
            </div>
          )}
        </motion.section>

      </div>
    </main>
  );
}

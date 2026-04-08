'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from '../onboarding.module.css';

// ─── Utility: Clean Markdown Response ───
const cleanMessage = (text: string) => {
  if (!text) return '';
  // NotebookLM citations like [1], [2], [1, 2] 제거
  return text.replace(/\[\d+(?:,\s*\d+)*\]/g, '').trim();
};

// ─── Sub-Component: Typing Indicator ───
const TypingIndicator = () => (
  <div className={styles.typingContainer}>
    <div className={styles.dot}></div>
    <div className={styles.dot}></div>
    <div className={styles.dot}></div>
  </div>
);

// ─── Sub-Component: Guide Tab (AI Chat) ───
export const GuideTab = () => {
  const [messages, setMessages] = useState([
    { role: 'bot', content: '안녕하세요! SDV시스템실에 오신 것을 환영합니다. 무엇을 도와드릴까요?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recoLoading, setRecoLoading] = useState(false);

  // 추천 질문 가져오기
  const fetchRecommendations = async (force = false) => {
    setRecoLoading(true);
    try {
      const url = `/api/onboarding/guide/recommendations${force ? '?force=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
      } else {
        // 폴백
        setRecommendations(['SDV실의 주요 업무', '신입 교육 기간', '사내 복지 혜택', '출퇴근 셔틀 이용', '사내 식당 메뉴']);
      }
    } catch (err) {
      setRecommendations(['SDV실의 주요 업무', '신입 교육 기간', '사내 복지 혜택', '출퇴근 셔틀 이용', '사내 식당 메뉴']);
    } finally {
      setRecoLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/onboarding/guide?question=${encodeURIComponent(userMsg.content)}`);
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'bot', content: cleanMessage(data.answer) }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', content: '죄송합니다. 정보를 가져오는 데 오류가 발생했습니다.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: '네트워크 연결 상태를 확인해 주세요.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.guideGrid}>
      <div className={styles.chatWindow}>
        <div className={styles.chatMessages}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userMessage : styles.botMessage}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ))}
          {loading && (
            <div className={styles.botMessage} style={{ background: 'transparent', padding: '0' }}>
              <TypingIndicator />
            </div>
          )}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(198, 197, 209, 0.1)', background: '#fff', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              className={styles.searchInput} 
              style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', background: '#F4F7FE', border: 'none' }} 
              placeholder="궁금한 내용을 질문해 보세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
          </div>
          <button 
            onClick={sendMessage}
            className={styles.tabButton}
            style={{ 
              width: '45px', height: '45px', minWidth: '45px', borderRadius: '12px', 
              background: '#4318FF', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(67, 24, 255, 0.2)'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>send</span>
          </button>
        </div>
      </div>
      <div className={styles.glassCard} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#1B2559' }}>추천 질문</h4>
          <button 
            onClick={() => fetchRecommendations(true)}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
              color: recoLoading ? '#a3aed0' : '#4318FF', transition: 'all 0.3s',
              transform: recoLoading ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
            disabled={recoLoading}
            title="새로운 질문 추천받기"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>refresh</span>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {recoLoading ? (
            <div style={{ fontSize: '12px', color: '#a3aed0', textAlign: 'center', padding: '10px' }}>질문 생성 중...</div>
          ) : recommendations.length > 0 ? (
            recommendations.map((q, i) => (
              <button 
                key={i} 
                className={styles.tabButton} 
                style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', lineHeight: '1.4' }} 
                onClick={() => setInput(q)}
              >
                {q}
              </button>
            ))
          ) : (
            <div style={{ fontSize: '12px', color: '#a3aed0', textAlign: 'center' }}>추천 질문이 없습니다.</div>
          )}
        </div>
        <div style={{ marginTop: 'auto', padding: '16px', background: '#f4f7fe', borderRadius: '16px', fontSize: '13px', color: '#767680' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '8px' }}>info</span>
          NotebookLM AI 가이드 (v1.0.2)
        </div>
      </div>
    </div>
  );
};

// ─── Sub-Component: Checklist Tab ───
export const ChecklistTab = () => {
  const [subTab, setSubTab] = useState<'my' | 'dept'>('my');
  const [activeMember, setActiveMember] = useState('m1');
  const [members, setMembers] = useState<any[]>([]);

  // 체크리스트 상태 관리 (사용자 요청 목록 반영)
  const [myItems, setMyItems] = useState([
    { id: 1, category: '필수 프로그램 설치', label: 'eset 백신 설치', done: false },
    { id: 2, category: '필수 프로그램 설치', label: 'nac ipscan 설치', done: false },
    { id: 3, category: '필수 프로그램 설치', label: '에스원 문서보안 설치', done: false },
    { id: 4, category: '보조 프로그램 설치', label: '반디집', done: false },
    { id: 5, category: '보조 프로그램 설치', label: 'notepad++', done: false },
    { id: 6, category: '보조 프로그램 설치', label: 'omnisa horizon client', done: false },
    { id: 7, category: '보조 프로그램 설치', label: 'Microsoft Office', done: false },
    { id: 8, category: '메일 서명', label: '메일 서명 생성', done: false },
  ]);

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then(res => res.json())
      .then(data => data.success && setMembers(data.members));
  }, []);

  // 진척도 계산
  const totalCount = myItems.length;
  const doneCount = myItems.filter(item => item.done).length;
  const progressPercent = Math.round((doneCount / totalCount) * 100);

  // 체크 토글 함수
  const toggleItem = (id: number) => {
    setMyItems(prev => prev.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  return (
    <div className={styles.contentArea}>
      {/* Sub-Navigation for Checklist */}
      <div className={styles.tabsContainer} style={{ marginBottom: '24px', background: 'rgba(255, 255, 255, 0.3)' }}>
        <button 
          className={`${styles.tabButton} ${subTab === 'my' ? styles.tabButtonActive : ''}`}
          onClick={() => setSubTab('my')}
          style={{ fontSize: '13px', padding: '8px 20px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
          나의 온보딩
        </button>
        <button 
          className={`${styles.tabButton} ${subTab === 'dept' ? styles.tabButtonActive : ''}`}
          onClick={() => setSubTab('dept')}
          style={{ fontSize: '13px', padding: '8px 20px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>groups</span>
          팀원 현황 (Dept Status)
        </button>
      </div>

      {subTab === 'my' ? (
        /* My Onboarding View (Redesigned) */
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          {/* 1. Summary Card */}
          <div className={styles.summaryCard}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#4318FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '24px' }}>stars</span>
                </div>
                <h3 style={{ margin: 0, color: '#1B2559', fontSize: '24px', fontWeight: 800 }}>Onboarding Journey</h3>
              </div>
              <p style={{ margin: 0, color: '#767680', fontSize: '15px' }}>
                {progressPercent === 100 ? (
                  <>
                    <span style={{ color: '#05CD99', fontWeight: 700 }}>축하합니다!</span> 모든 온보딩 과정을 완벽하게 마치셨습니다. 🎉
                  </>
                ) : (
                  <>
                    현재 <span style={{ color: '#4318FF', fontWeight: 700 }}>{doneCount}개</span> 항목을 완료했습니다. 
                    남은 <span style={{ fontWeight: 700 }}>{totalCount - doneCount}개</span> 과제도 힘내세요!
                  </>
                )}
              </p>
              <div style={{ marginTop: '20px', display: 'flex', gap: '32px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#a3aed0', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Total Progress</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1B2559' }}>{progressPercent}%</div>
                </div>
                <div style={{ width: '1px', background: '#E2E8F0' }}></div>
                <div>
                  <div style={{ fontSize: '12px', color: '#a3aed0', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Remaining Tasks</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#4318FF' }}>{totalCount - doneCount}</div>
                </div>
              </div>
            </div>

            <div className={styles.progressRingContainer} style={{ width: '140px', height: '140px' }}>
              <svg width="140" height="140">
                <defs>
                  <linearGradient id="progGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4318FF"  />
                    <stop offset="100%" stopColor="#707EAE" />
                  </linearGradient>
                </defs>
                <circle cx="70" cy="70" r="60" fill="none" stroke="#f4f7fe" strokeWidth="12" />
                <circle cx="70" cy="70" r="60" fill="none" stroke="url(#progGradient)" strokeWidth="12" 
                  strokeDasharray="376.99" strokeDashoffset={376.99 * (1 - progressPercent / 100)} 
                  strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#1B2559' }}>{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* 2. Milestone Grid */}
          <div className={styles.milestoneGrid}>
            {Array.from(new Set(myItems.map(item => item.category))).map(category => {
              const categoryItems = myItems.filter(item => item.category === category);
              const categoryDone = categoryItems.filter(i => i.done).length;
              const categoryTotal = categoryItems.length;
              const categoryProgress = Math.round((categoryDone / categoryTotal) * 100);
              const isAllDone = categoryDone === categoryTotal;

              return (
                <div key={category} className={styles.milestoneCard} style={{ borderColor: isAllDone ? '#4318FF' : undefined }}>
                  <div className={styles.milestoneHeader}>
                    <div className={styles.milestoneTitle}>
                      <span className="material-symbols-outlined" style={{ color: isAllDone ? '#05CD99' : '#4318FF', fontSize: '20px' }}>
                        {isAllDone ? 'check_circle' : category === '필수 프로그램 설치' ? 'verified_user' : category === '보조 프로그램 설치' ? 'extension' : 'signature'}
                      </span>
                      {category}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: isAllDone ? '#05CD99' : '#4318FF' }}>{categoryProgress}%</span>
                  </div>
                  
                  <div className={styles.miniProgressBar}>
                    <div className={styles.miniProgressFill} style={{ width: `${categoryProgress}%`, background: isAllDone ? '#05CD99' : undefined }}></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    {categoryItems.map(item => (
                      <div 
                        key={item.id} 
                        className={`${styles.checkItemEnhanced} ${item.done ? styles.checkItemDoneEnhanced : ''}`}
                        onClick={() => toggleItem(item.id)}
                      >
                        <span className={`material-symbols-outlined ${item.done ? styles.checkedIcon : styles.uncheckedIcon}`}>
                          {item.done ? 'check_circle' : 'circle'}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#2B3674' }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 1. Dept Status View */
        <div className={styles.deptDashboard} style={{ animation: 'fadeIn 0.5s ease' }}>
          {/* Left: Member Sidebar */}
          <div className={styles.memberSideList}>
            <div style={{ padding: '0 4px 12px', borderBottom: '1px solid #eee', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, color: '#1B2559', fontSize: '16px', fontWeight: 800 }}>Team Members</h4>
              <p style={{ margin: '4px 0 0', color: '#A3AED0', fontSize: '12px' }}>총 {members.length}명의 부서원</p>
            </div>
            {members.map(member => (
              <div 
                key={member.id} 
                className={`${styles.memberCardEnhanced} ${activeMember === member.id ? styles.memberCardActiveEnhanced : ''}`}
                onClick={() => setActiveMember(member.id)}
              >
                <div className={styles.avatar} style={{ 
                  background: activeMember === member.id ? '#4318FF' : '#F4F7FE', 
                  color: activeMember === member.id ? '#fff' : '#4318FF',
                  fontWeight: 800
                }}>
                  {member.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1B2559', fontSize: '14px' }}>{member.name}</div>
                  <div style={{ fontSize: '11px', color: '#A3AED0' }}>{member.team}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#1B2559' }}>{member.progress}%</div>
                  <div style={{ width: '40px', height: '4px', background: '#F4F7FE', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${member.progress}%`, height: '100%', background: '#4318FF' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Analysis Dashboard */}
          <div style={{ minHeight: '600px', flex: 1 }}>
            {activeMember ? (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                <div className={styles.memberDetailTitle}>
                   <span className="material-symbols-outlined" style={{ color: '#4318FF' }}>analytics</span>
                   Member Onboarding Analytics
                </div>

                {/* Profile Header Widget */}
                <div className={styles.glassCard} style={{ marginBottom: '24px', padding: '24px', display: 'flex', alignItems: 'center', gap: '24px', background: 'linear-gradient(135deg, #ffffff 0%, #f4f7fe 100%)' }}>
                   <div className={styles.avatar} style={{ width: '80px', height: '80px', fontSize: '32px', background: '#4318FF', color: '#fff', boxShadow: '0 10px 20px rgba(67, 24, 255, 0.2)' }}>
                     {members.find(m => m.id === activeMember)?.name[0]}
                   </div>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#1B2559', marginBottom: '4px' }}>{members.find(m => m.id === activeMember)?.name}</div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                         <span style={{ fontSize: '14px', color: '#767680', background: '#fff', padding: '4px 12px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                           {members.find(m => m.id === activeMember)?.team}
                         </span>
                         <span style={{ fontSize: '13px', color: '#A3AED0' }}>입사 3주차 (Onboarding)</span>
                      </div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#A3AED0', fontWeight: 600, marginBottom: '4px' }}>CURRENT STATUS</div>
                      <div style={{ padding: '6px 16px', borderRadius: '10px', background: members.find(m => m.id === activeMember)?.progress > 80 ? '#05CD99' : '#FFB800', color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                        {members.find(m => m.id === activeMember)?.progress > 80 ? '임무 완수' : '진행 중'}
                      </div>
                   </div>
                </div>

                {/* Stats Grid */}
                {(() => {
                  const member = members.find(m => m.id === activeMember);
                  const memberProgress = member?.progress || 0;
                  const totalTasksCount = myItems.length;
                  const completedTasksCount = myItems.filter((_, i) => (i + 1) / totalTasksCount * 100 <= memberProgress).length;
                  const requiredActionsCount = totalTasksCount - completedTasksCount;

                  return (
                    <div className={styles.statGrid}>
                       <div className={styles.statWidget}>
                          <div className={styles.statLabel}>Total Progress</div>
                          <div className={styles.statValue} style={{ color: '#4318FF' }}>{memberProgress}%</div>
                       </div>
                       <div className={styles.statWidget}>
                          <div className={styles.statLabel}>Completed Tasks</div>
                          <div className={styles.statValue}>{completedTasksCount} / {totalTasksCount}</div>
                       </div>
                       <div className={styles.statWidget}>
                          <div className={styles.statLabel}>Required Actions</div>
                          <div className={styles.statValue} style={{ color: '#EE5D50' }}>{requiredActionsCount}</div>
                       </div>
                    </div>
                  );
                })()}

                {/* Detailed Roadmap */}
                <div className={styles.glassCard} style={{ padding: '24px' }}>
                   <h4 style={{ margin: '0 0 20px', color: '#1B2559', fontSize: '16px', fontWeight: 800 }}>Detailed Task Roadmap</h4>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {Array.from(new Set(myItems.map(item => item.category))).map(category => {
                         const categoryItems = myItems.filter(item => item.category === category);
                         const icon = category === '필수 프로그램 설치' ? 'verified_user' : 
                                      category === '보조 프로그램 설치' ? 'extension' : 'signature';

                         return (
                           <div key={category}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                 <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#4318FF' }}>{icon}</span>
                                 <span style={{ fontSize: '14px', fontWeight: 800, color: '#1B2559' }}>{category}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                                {categoryItems.map((task) => {
                                  // Get original index in myItems to determine "isDone" simulation
                                  const originalIndex = myItems.findIndex(m => m.id === task.id);
                                  const memberProgress = members.find(m => m.id === activeMember)?.progress || 0;
                                  const isDone = (originalIndex + 1) / myItems.length * 100 <= memberProgress;

                                  return (
                                    <div key={task.id} style={{ 
                                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                                      background: isDone ? 'rgba(5, 205, 153, 0.05)' : '#f8fafd', 
                                      borderRadius: '12px', border: '1px solid',
                                      borderColor: isDone ? 'rgba(5, 205, 153, 0.2)' : 'transparent',
                                      transition: 'all 0.2s ease'
                                    }}>
                                      <div style={{ 
                                        width: '28px', height: '28px', borderRadius: '8px', 
                                        background: isDone ? '#05CD99' : '#E2E8F0', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' 
                                      }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                          {isDone ? 'check' : 'pending'}
                                        </span>
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B2559' }}>{task.label}</div>
                                      </div>
                                      {isDone && (
                                        <span className="material-symbols-outlined" style={{ color: '#05CD99', fontSize: '18px' }}>check_circle</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                           </div>
                         );
                      })}
                   </div>
                </div>
              </div>
            ) : (
              <div className={styles.glassCard} style={{ textAlign: 'center', padding: '100px 40px', color: '#a3aed0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F4F7FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#4318FF' }}>person_search</span>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px', color: '#1B2559' }}>팀원을 선택해 주세요</h4>
                  <p style={{ margin: 0, fontSize: '14px' }}>팀원을 선택하면 상세한 온보딩 분석 리포트를 확인할 수 있습니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-Component: Growth Tab ───
export const GrowthTab = () => {
  const [subTab, setSubTab] = useState<'edu' | 'conf'>('edu');
  const [eduList, setEduList] = useState<any[]>([]);
  const [confList, setConfList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false); // 조회 전용 로딩
  const [syncLoading, setSyncLoading] = useState(false);   // 동기화 전용 로딩

  // ─── 필터 및 분류 상태 ───
  const [isGrouped, setIsGrouped] = useState(true);      // 지역별 분류 여부
  const [searchTerm, setSearchTerm] = useState('');      // 키워드 검색어
  const [regionFilter, setRegionFilter] = useState('All'); // 지역 필터 (All, Korea, International)
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]); // 선택된 키워드 필터
  const [isKeywordsOpen, setIsKeywordsOpen] = useState(false); // 키워드 필터 펼침 여부

  // 컨퍼런스 채팅 상태
  const [confMessages, setConfMessages] = useState([
    { role: 'bot', content: '수집된 컨퍼런스 정보에 대해 궁금한 점을 물어보세요!' }
  ]);
  const [confInput, setConfInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [newEdu, setNewEdu] = useState({ title: '', date: '', instructor: '', tag: '일반' });

  const fetchEdu = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/education');
      const data = await res.json();
      if (data.success) setEduList(data.education);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConference = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch('/api/onboarding/conference');
      const data = await res.json();
      if (data.success) setConfList(data.conferences);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  const syncConference = async () => {
    if (!confirm('웹에서 최신 정보를 검색하여 구글 시트를 갱신하시겠습니까? (약 15~30초 소요)')) return;
    setSyncLoading(true);
    try {
      const res = await fetch('/api/onboarding/conference/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`${data.count}개의 새로운 컨퍼런스 정보를 수집하여 시트를 갱신했습니다.`);
        fetchConference();
      } else {
        alert(`동기화 실패: ${data.error}`);
      }
    } catch (err) {
      alert('동기화 중 서버 오류가 발생했습니다.');
    } finally {
      setSyncLoading(false);
    }
  };

  // ─── 필터링 로직 ───
  const getFilteredList = (list: any[]) => {
    return list.filter(item => {
      // 1. 검색어 필터링 (명칭 또는 키워드)
      const matchesSearch = 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.keywords?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. 지역 선택 필터링
      let matchesRegion = true;
      const isKorea = item.region?.includes('Korea') || item.region?.includes('Domestic');
      const isGlobal = !isKorea && item.region; // Korea 외에는 Global로 간주

      if (regionFilter === 'Korea') matchesRegion = isKorea;
      else if (regionFilter === 'International') matchesRegion = isGlobal;

      // 3. 키워드 칩 필터링 (선택된 키워드가 하나라도 있으면, 그 중 하나를 포함해야 함)
      let matchesKeywords = true;
      if (activeKeywords.length > 0) {
        matchesKeywords = activeKeywords.some(kw => item.keywords?.includes(kw) || item.name?.includes(kw));
      }

      return matchesSearch && matchesRegion && matchesKeywords;
    });
  };

  const filteredConfList = getFilteredList(confList);

  // ─── 유니크 키워드 추출 (칩 UI용) ───
  const allKeywords = React.useMemo(() => {
    const kwMap = new Map<string, number>();
    confList.forEach(c => {
      if (c.keywords) {
        c.keywords.split(',').forEach((k: string) => {
          const trimmed = k.trim();
          if (trimmed) kwMap.set(trimmed, (kwMap.get(trimmed) || 0) + 1);
        });
      }
    });
    // 빈도순 정렬하여 상위 15개 정도 노출
    return Array.from(kwMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [confList]);

  const toggleKeyword = (kw: string) => {
    setActiveKeywords(prev => 
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );
  };

  const sendConfMessage = async () => {
    if (!confInput.trim() || chatLoading) return;
    
    const userMsg = { role: 'user', content: confInput };
    setConfMessages(prev => [...prev, userMsg]);
    setConfInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/onboarding/conference/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content })
      });
      const data = await res.json();
      if (data.success) {
        setConfMessages(prev => [...prev, { role: 'bot', content: cleanMessage(data.answer) }]);
      } else {
        setConfMessages(prev => [...prev, { role: 'bot', content: '답변을 가져오는 중 오류가 발생했습니다.' }]);
      }
    } catch (err) {
      setConfMessages(prev => [...prev, { role: 'bot', content: '네트워크 상태를 확인해 주세요.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const addEdu = async () => {
    if (!newEdu.title || !newEdu.date) return alert('제목과 날짜를 입력해주세요.');
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/education', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEdu)
      });
      if (res.ok) {
        setShowModal(false);
        setNewEdu({ title: '', date: '', instructor: '', tag: '일반' });
        fetchEdu();
      }
    } catch (err) {
      alert('추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const deleteEdu = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/onboarding/education/${id}`, { method: 'DELETE' });
      if (res.ok) fetchEdu();
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'edu') fetchEdu();
    if (subTab === 'conf') fetchConference();
  }, [subTab]);

  return (
    <div className={styles.contentArea}>
      {/* Sub-Navigation */}
      <div className={styles.tabsContainer} style={{ marginBottom: '24px', background: 'rgba(255, 255, 255, 0.3)' }}>
        <button className={`${styles.tabButton} ${subTab === 'edu' ? styles.tabButtonActive : ''}`} onClick={() => setSubTab('edu')}>사내교육</button>
        <button className={`${styles.tabButton} ${subTab === 'conf' ? styles.tabButtonActive : ''}`} onClick={() => setSubTab('conf')}>컨퍼런스</button>
      </div>

      {subTab === 'edu' ? (
        <div className={styles.glassCard} style={{ animation: 'fadeIn 0.4s ease' }}>
          <div className={styles.growthSubHeader}>
            <h4 style={{ margin: 0, color: '#1B2559' }}>사내 교육 관리 (Google Sheets)</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={styles.tabButton} 
                style={{ background: '#F4F7FE', color: '#4318FF', fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={fetchEdu}
                disabled={loading}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                {loading ? '갱신 중...' : '새로고침'}
              </button>
              <button 
                className={styles.tabButton} 
                style={{ background: '#4318FF', color: '#fff', fontSize: '13px', padding: '8px 16px' }}
                onClick={() => setShowModal(true)}
              >
                + 교육 프로세스 추가
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {loading && eduList.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>로딩 중...</div>
            ) : eduList.length > 0 ? (
              eduList.map((edu, idx) => (
                <div key={idx} className={styles.eduCard} style={{ position: 'relative' }}>
                  <button 
                    onClick={() => deleteEdu(edu.id)}
                    style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#a3aed0' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                  </button>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <span className={`${styles.statusBadge} ${edu.tag === '필수' ? styles.badgeUpcoming : edu.tag === '심화' ? styles.badgeOpen : styles.badgePlanned}`}>
                      {edu.tag}
                    </span>
                    <span style={{ fontSize: '12px', color: '#718096' }}>
                      {edu.date ? edu.date.split('T')[0] : '미지정'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, color: '#1B2559', fontSize: '16px', marginBottom: '8px' }}>{edu.title}</div>
                  <div style={{ fontSize: '13px', color: '#767680', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                    담당: {edu.instructor || '미지정'}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#a3aed0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>school</span>
                등록된 교육 과정이 없습니다.
              </div>
            )}
          </div>

          {/* Add Modal */}
          {showModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className={styles.glassCard} style={{ width: '400px', padding: '32px', background: '#fff' }}>
                <h3 style={{ margin: '0 0 24px', color: '#1B2559' }}>신규 교육 추가</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   <input type="text" placeholder="교육 이름" className={styles.searchInput} style={{ width: '100%', padding: '12px' }} value={newEdu.title} onChange={e => setNewEdu({...newEdu, title: e.target.value})} />
                   <input type="date" placeholder="날짜" className={styles.searchInput} style={{ width: '100%', padding: '12px' }} value={newEdu.date} onChange={e => setNewEdu({...newEdu, date: e.target.value})} />
                   <input type="text" placeholder="담당자" className={styles.searchInput} style={{ width: '100%', padding: '12px' }} value={newEdu.instructor} onChange={e => setNewEdu({...newEdu, instructor: e.target.value})} />
                   <select className={styles.searchInput} style={{ width: '100%', padding: '12px' }} value={newEdu.tag} onChange={e => setNewEdu({...newEdu, tag: e.target.value})}>
                      <option value="필수">필수</option>
                      <option value="심화">심화</option>
                      <option value="일반">일반</option>
                   </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                   <button className={styles.tabButton} style={{ flex: 1 }} onClick={() => setShowModal(false)}>취소</button>
                   <button className={styles.tabButton} style={{ flex: 1, background: '#4318FF', color: '#fff' }} onClick={addEdu} disabled={loading}>저장</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Conference Tab Layout - Grid 2 Column (List 7 : Chat 3) */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', animation: 'fadeIn 0.4s ease' }}>
          {/* Left: Conference Cards */}
          <div className={styles.glassCard} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className={styles.growthSubHeader}>
              <h4 style={{ margin: 0, color: '#1B2559' }}>글로벌/국내 컨퍼런스 (AI Search)</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className={`${styles.tabButton} ${fetchLoading ? styles.loadingButton : ''}`} 
                  style={{ background: '#F4F7FE', color: '#4318FF', fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={fetchConference}
                  disabled={fetchLoading || syncLoading}
                >
                  <span className={`material-symbols-outlined ${fetchLoading ? styles.spin : ''}`} style={{ fontSize: '18px' }}>refresh</span>
                  조회
                </button>
                <button 
                  className={`${styles.tabButton} ${syncLoading ? styles.loadingButton : ''}`} 
                  style={{ background: '#4318FF', color: '#fff', fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={syncConference}
                  disabled={fetchLoading || syncLoading}
                >
                  <span className={`material-symbols-outlined ${syncLoading ? styles.spin : ''}`} style={{ fontSize: '18px' }}>{syncLoading ? 'sync' : 'neurology'}</span>
                  {syncLoading ? 'AI 분석 중...' : '실시간 AI 검색/갱신'}
                </button>
            </div>
          </div>

          {/* ───── Filter & Control Bar ───── */}
            <div className={styles.filterBar}>
              <div className={styles.searchWrapper}>
                <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                <input 
                  type="text" 
                  className={styles.searchInput} 
                  placeholder="컨퍼런스 명칭 또는 키워드 검색..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Region Quick Filters */}
                <div style={{ display: 'flex', background: '#fff', padding: '4px', borderRadius: '10px', border: '1px solid #eee', gap: '4px' }}>
                  {['All', 'Korea', 'International'].map(r => (
                    <button 
                      key={r}
                      onClick={() => setRegionFilter(r)}
                      style={{ 
                        padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: regionFilter === r ? '#4318FF' : 'transparent',
                        color: regionFilter === r ? '#fff' : '#767680',
                        fontWeight: regionFilter === r ? '700' : '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      {r === 'All' ? '전체' : r === 'Korea' ? '국내' : '해외'}
                    </button>
                  ))}
                </div>

                {/* Grouping Toggle */}
                <label className={styles.toggleContainer}>
                  <span>지역별 분류</span>
                  <div className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={isGrouped} 
                      onChange={() => setIsGrouped(!isGrouped)} 
                    />
                    <span className={styles.slider}></span>
                  </div>
                </label>
              </div>
            </div>

            {/* ───── Keyword Chips (Collapsible) ───── */}
            {allKeywords.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div 
                  onClick={() => setIsKeywordsOpen(!isKeywordsOpen)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', 
                    fontSize: '12px', fontWeight: 700, color: '#767680', marginBottom: isKeywordsOpen ? '12px' : '0',
                    padding: '8px 4px', borderRadius: '8px', transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(67, 24, 255, 0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="material-symbols-outlined" style={{ 
                    fontSize: '18px', transition: 'transform 0.3s',
                    transform: isKeywordsOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
                  }}>expand_more</span>
                  관련 키워드로 상세 필터링 {activeKeywords.length > 0 && <span style={{ color: '#4318FF' }}>( {activeKeywords.length}개 선택됨 )</span>}
                </div>

                {isKeywordsOpen && (
                  <div className={styles.keywordContainer} style={{ animation: 'fadeIn 0.3s ease' }}>
                    {allKeywords.map(([kw, count]) => (
                      <div 
                        key={kw} 
                        className={`${styles.keywordChip} ${activeKeywords.includes(kw) ? styles.keywordChipActive : ''}`}
                        onClick={() => toggleKeyword(kw)}
                      >
                        #{kw} <span className={styles.chipCount}>{count}</span>
                      </div>
                    ))}
                    {activeKeywords.length > 0 && (
                      <div 
                        className={styles.keywordChip} 
                        style={{ background: '#f4f7fe', color: '#ff4d4f', border: '1px solid #ffccc7' }}
                        onClick={() => setActiveKeywords([])}
                      >
                        초기화
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '8px' }}>
              {isGrouped ? (
                <>
                  {/* Korea Group */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f4f7fe', paddingBottom: '8px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#4318FF' }}>location_on</span>
                      <h5 style={{ margin: 0, color: '#1B2559' }}>Korea</h5>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {filteredConfList.filter(c => c.region?.includes('Korea') || c.region?.includes('Domestic')).length > 0 ? (
                        filteredConfList.filter(c => c.region?.includes('Korea') || c.region?.includes('Domestic')).map((c, i) => (
                          <div key={i} className={styles.eduCard} style={{ borderLeft: '4px solid #4318FF' }}>
                            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>{c.date}</div>
                            <div style={{ fontWeight: 800, color: '#1B2559', marginBottom: '8px', fontSize: '14px' }}>{c.name}</div>
                            <div style={{ fontSize: '11px', background: '#F4F7FE', color: '#4318FF', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>{c.keywords}</div>
                            <div style={{ fontSize: '12px', color: '#767680' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>map</span> {c.location}</div>
                          </div>
                        ))
                      ) : <div style={{ color: '#a3aed0', fontSize: '13px', padding: '10px' }}>해당하는 정보가 없습니다.</div>}
                    </div>
                  </div>

                  {/* International Group */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f4f7fe', paddingBottom: '8px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#01B574' }}>public</span>
                      <h5 style={{ margin: 0, color: '#1B2559' }}>International</h5>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {filteredConfList.filter(c => !(c.region?.includes('Korea') || c.region?.includes('Domestic'))).length > 0 ? (
                        filteredConfList.filter(c => !(c.region?.includes('Korea') || c.region?.includes('Domestic'))).map((c, i) => (
                          <div key={i} className={styles.eduCard} style={{ borderLeft: '4px solid #01B574' }}>
                            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>{c.date}</div>
                            <div style={{ fontWeight: 800, color: '#1B2559', marginBottom: '8px', fontSize: '14px' }}>{c.name}</div>
                            <div style={{ fontSize: '11px', background: '#F4FFF4', color: '#01B574', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>{c.keywords}</div>
                            <div style={{ fontSize: '12px', color: '#767680' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>map</span> {c.location}</div>
                          </div>
                        ))
                      ) : <div style={{ color: '#a3aed0', fontSize: '13px', padding: '10px' }}>해당하는 정보가 없습니다.</div>}
                    </div>
                  </div>
                </>
              ) : (
                /* Flat List View */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f4f7fe', paddingBottom: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#718096' }}>list</span>
                    <h5 style={{ margin: 0, color: '#1B2559' }}>전체 컨퍼런스 리스트 (최신순)</h5>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {filteredConfList.length > 0 ? (
                      filteredConfList.map((c, i) => (
                        <div key={i} className={styles.eduCard} style={{ borderLeft: `4px solid ${c.region?.includes('Korea') || c.region?.includes('Domestic') ? '#4318FF' : '#01B574'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>{c.date}</div>
                            <div style={{ fontSize: '10px', color: '#a3aed0' }}>{c.region}</div>
                          </div>
                          <div style={{ fontWeight: 800, color: '#1B2559', marginBottom: '8px', fontSize: '14px' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', background: c.region?.includes('Korea') || c.region?.includes('Domestic') ? '#F4F7FE' : '#F4FFF4', color: c.region?.includes('Korea') || c.region?.includes('Domestic') ? '#4318FF' : '#01B574', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>{c.keywords}</div>
                          <div style={{ fontSize: '12px', color: '#767680' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>map</span> {c.location}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#a3aed0', fontSize: '13px', padding: '20px', textAlign: 'center', gridColumn: '1/-1' }}>검색 결과가 없습니다.</div>
                    )}
                  </div>
                </div>
              )}

              {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#4318FF' }}>데이터 분석 및 로딩 중...</div>}
            </div>
          </div>

          {/* Right: AI Conference Chat Sidebar (Fixed & Sticky) */}
          <div className={styles.glassCard} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '800px', // 높이를 적절히 충분하게 고정
            position: 'sticky',
            top: '80px', // 탭 아래를 기준으로 적절한 여백 확보
            alignSelf: 'flex-start', // 리스트가 길어도 대화창 자체가 늘어나지 않도록 방지
            padding: '0', 
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(198, 197, 209, 0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #4318FF, #707EAE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '18px' }}>smart_toy</span>
              </div>
              <div>
                <h5 style={{ margin: 0, color: '#1B2559', fontSize: '14px' }}>AI 컨퍼런스 어시스턴트</h5>
                <p style={{ margin: 0, fontSize: '11px', color: '#a3aed0' }}>수집된 소스 기반 지능형 분석</p>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {confMessages.map((msg, idx) => (
                <div key={idx} className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userMessage : styles.botMessage}`} style={{ fontSize: '13px', maxWidth: '90%' }}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ))}
              {chatLoading && (
                <div className={styles.botMessage} style={{ background: 'transparent', padding: '0' }}>
                  <TypingIndicator />
                </div>
              )}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid rgba(198, 197, 209, 0.2)', background: 'rgba(244, 247, 254, 0.5)' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className={styles.searchInput} 
                  style={{ width: '100%', padding: '10px 45px 10px 15px', fontSize: '13px', borderRadius: '12px' }} 
                  placeholder="무엇이든 물어보세요..."
                  value={confInput}
                  onChange={(e) => setConfInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendConfMessage()}
                />
                <button 
                  onClick={sendConfMessage}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#4318FF', padding: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

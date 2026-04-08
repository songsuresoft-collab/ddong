'use client';
import { useState, useEffect } from 'react';
import { useApiData } from '../hooks/useApiData';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface Meeting { date: string; title: string; participants: string; summary: string[]; raw?: string; }
interface ActionItem { item: string; owner: string; due: string; status: string; }
interface MinutesData {
  success: boolean;
  meetings: Meeting[];
  open_action_items: ActionItem[];
  total_open_items: number;
  raw?: string;
  error?: string;
  _warning?: string;
  _data_changed?: boolean;
  _from_cache?: boolean;
}

export default function MinutesPage() {
  const { data, loading, error, refetch } = useApiData<MinutesData>('/minutes');

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [actionStatuses, setActionStatuses] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<string>('전체'); // '전체', '미완료', '진행중', '완료'

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('minutes_action_status');
      if (saved) {
        setActionStatuses(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading action statuses:', e);
    }
  }, []);

  // Save to localStorage whenever actionStatuses change
  useEffect(() => {
    localStorage.setItem('minutes_action_status', JSON.stringify(actionStatuses));
  }, [actionStatuses]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMeeting(null);
      }
    };
    if (selectedMeeting) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedMeeting]);

  const handleStatusChange = (index: number, newStatus: string) => {
    setActionStatuses(prev => ({
      ...prev,
      [index]: newStatus
    }));
  };

  const isOverdue = (dueStr: string) => {
    if (!dueStr || dueStr === 'TBD') return false;
    const d = new Date(dueStr);
    if (isNaN(d.getTime())) return false;
    return d.getTime() < new Date().setHours(0,0,0,0);
  };

  if (loading) return <LoadingSkeleton />;

  // 네트워크 오류(res.ok 실패)만 전체 오류 화면으로 처리
  if (error && !data) return (
    <main style={{ padding: '32px', textAlign: 'center', color: '#ba1a1a' }}>
      <p>데이터 로드 실패: {error}</p>
      <button onClick={() => refetch(true)} style={{ marginTop: '16px', padding: '12px 24px', backgroundColor: '#1b2559', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>재시도</button>
    </main>
  );

  // success:False + meetings 빈 배열이면 오류 안내 (캐시 폴백 데이터 있으면 그냥 표시)
  if (data && !data.success && (!data.meetings || data.meetings.length === 0)) return (
    <main style={{ padding: '32px' }}>
      <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#B91C1C' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '8px', display: 'block' }}>error_outline</span>
        <p style={{ fontWeight: 700, marginBottom: '8px' }}>데이터를 불러오지 못했습니다</p>
        <p style={{ fontSize: '13px', color: '#DC2626' }}>{data.error || '알 수 없는 오류'}</p>
        <button onClick={() => refetch(true)} style={{ marginTop: '16px', padding: '10px 24px', backgroundColor: '#1b2559', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>다시 시도</button>
      </div>
    </main>
  );

  const openItemsCount = (data?.open_action_items || []).filter((_, i) => (actionStatuses[i] || '미완료') === '미완료').length;

  const filteredActionItems = (data?.open_action_items || []).map((item, index) => ({
    ...item,
    originalIndex: index,
    currentStatus: actionStatuses[index] || '미완료'
  })).filter(item => filter === '전체' || item.currentStatus === filter);

  return (
    <main style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
      {/* 경고/변동 알림 배너 */}
      {data?._warning && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#92400E' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#D97706' }}>warning</span>
          <span>{data._warning}</span>
        </div>
      )}
      {data?._data_changed === true && (
        <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#15803D' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#22C55E' }}>check_circle</span>
          <span>새로운 데이터가 감지되어 캐시가 갱신되었습니다.</span>
        </div>
      )}
      {data?._data_changed === false && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
          <span>데이터 변동 없음 — 기존 캐시와 동일합니다.</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#030e44', fontFamily: 'Manrope, sans-serif' }}>회의록</h1>
          <p style={{ margin: '4px 0 0', color: '#767680', fontSize: '14px' }}>AI 3줄 핵심 요약 + Action Item 상태 관리</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ backgroundColor: '#ffdad6', color: '#93000a', padding: '6px 16px', borderRadius: '9999px', fontWeight: 700, fontSize: '14px' }}>
            미완료 {openItemsCount}건
          </span>
          <button onClick={() => refetch(true)} style={{ backgroundColor: '#1b2559', color: '#fff', padding: '10px 20px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: loading ? 'spin 1s linear infinite' : 'none' }}>refresh</span>{loading ? 'AI 재분석 중...' : 'AI 재분석'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* 회의 목록 */}
        <section>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#030e44', fontFamily: 'Manrope, sans-serif' }}>
            회의 목록 <span style={{ fontSize: '13px', color: '#767680', fontWeight: 400 }}>— 클릭하면 상세 보기</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(data!.meetings || []).map((m, i) => (
              <div
                key={i}
                style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(3,14,68,0.06)', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                onClick={() => setSelectedMeeting(m)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.01)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(3,14,68,0.12)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(3,14,68,0.06)';
                }}
              >
                <div style={{ padding: '16px 24px', backgroundColor: '#1b2559', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#dee0ff', fontFamily: 'Manrope, sans-serif' }}>{m.title}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(222,224,255,0.7)' }}>{m.date} | {m.participants}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'rgba(222,224,255,0.6)' }}>open_in_new</span>
                </div>
                <div style={{ padding: '16px 24px' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#767680', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#8980ff' }}>auto_awesome</span>
                    AI 3줄 요약
                  </p>
                  <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(m.summary || []).slice(0, 3).map((s, j) => (
                      <li key={j} style={{ fontSize: '13px', color: '#181c21', lineHeight: 1.5 }}>{s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
            {(!data!.meetings || data!.meetings.length === 0) && (
              <p style={{ color: '#767680', textAlign: 'center', padding: '48px' }}>회의록 데이터 없음</p>
            )}
          </div>
        </section>

        {/* Action Items */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#030e44', fontFamily: 'Manrope, sans-serif' }}>Action Items</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['전체', '미완료', '진행중', '완료'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    backgroundColor: filter === f ? '#e0e0ff' : 'transparent',
                    color: filter === f ? '#1b2559' : '#767680',
                    border: '1px solid rgba(198,197,209,0.3)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(3,14,68,0.06)', overflow: 'hidden' }}>
            {filteredActionItems.map((item) => {
              const isDone = item.currentStatus === '완료';
              const overdue = item.currentStatus !== '완료' && isOverdue(item.due);

              return (
                <div key={item.originalIndex} style={{
                  padding: '16px 20px', borderBottom: '1px solid rgba(198,197,209,0.2)',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  opacity: isDone ? 0.5 : 1, transition: 'opacity 0.2s',
                  backgroundColor: overdue ? 'rgba(255,218,214,0.15)' : undefined,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#030e44', flex: 1, textDecoration: isDone ? 'line-through' : 'none' }}>{item.item}</p>
                    <select
                      value={item.currentStatus}
                      onChange={(e) => handleStatusChange(item.originalIndex, e.target.value)}
                      style={{
                        padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid rgba(198,197,209,0.5)',
                        backgroundColor: item.currentStatus === '미완료' ? '#ffdad6' : item.currentStatus === '진행중' ? '#e0f2fe' : '#e6f4ea',
                        color: item.currentStatus === '미완료' ? '#93000a' : item.currentStatus === '진행중' ? '#0369a1' : '#137333',
                        fontWeight: 600, outline: 'none', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <option value="미완료">미완료</option>
                      <option value="진행중">진행중</option>
                      <option value="완료">완료</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#767680' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>{item.owner}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: overdue ? '#ba1a1a' : undefined, fontWeight: overdue ? 700 : 400 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_today</span>
                      {item.due}
                      {overdue && ' ⚠ 기한 초과'}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredActionItems.length === 0 && (
              <p style={{ color: '#767680', textAlign: 'center', padding: '32px', fontSize: '14px' }}>해당 조건의 항목이 없습니다 ✅</p>
            )}
          </div>
        </section>
      </div>

      {/* Detail Modal */}
      {selectedMeeting && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '24px' }}
          onClick={() => setSelectedMeeting(null)}
        >
          <div
            style={{ backgroundColor: '#fff', borderRadius: '16px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(198,197,209,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#1b2559', color: '#fff', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>{selectedMeeting.title}</h2>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span>{selectedMeeting.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>groups</span>{selectedMeeting.participants}</span>
                </div>
              </div>
              <button onClick={() => setSelectedMeeting(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, padding: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#030e44', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8980ff' }}>auto_awesome</span>
                  AI 핵심 요약
                </h3>
                <ul style={{ margin: 0, paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedMeeting.summary || []).map((s, idx) => (
                    <li key={idx} style={{ fontSize: '14px', color: '#181c21', lineHeight: 1.6 }}>{s}</li>
                  ))}
                </ul>
              </div>

              {selectedMeeting.raw && (
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#030e44', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#767680' }}>draft</span>
                    원본 데이터
                  </h3>
                  <div style={{ backgroundColor: '#f5f5f7', padding: '16px', borderRadius: '8px', whiteSpace: 'pre-wrap', fontSize: '13px', color: '#444', lineHeight: 1.5, maxHeight: '300px', overflowY: 'auto', border: '1px solid rgba(198,197,209,0.2)' }}>
                    {selectedMeeting.raw}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(198,197,209,0.2)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedMeeting(null)} style={{ padding: '10px 24px', backgroundColor: '#e0e0ff', color: '#1b2559', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

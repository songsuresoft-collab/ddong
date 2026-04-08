'use client';
import React from 'react';
import { useApiData } from '../hooks/useApiData';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface TeamLoad {
  team: string; total_mm: number; available_mm: number; load_rate: number; status: string; hire_needed: number;
}
interface ResourceData {
  success: boolean; team_loads: TeamLoad[];
  total_headcount: { regular: number; intern: number; total: number };
  reallocation_ideas: string[]; ai_insight: string;
  overAllocation?: { teams: string[]; analysis: string };
  idleResource?: { teams: string[]; analysis: string };
  stats?: {
    total_rate: number;
    short_teams: string[];
    free_teams: string[];
    insight: string;
  };
  raw?: string;
}

const TEAM_COLOR: Record<string, string> = {
  SS1: '#6366F1', SS2: '#10B981', SS3: '#F59E0B', SS4: '#EF4444',
  '기타': '#94A3B8'
};

function utilColor(ratio: number) {
  if (ratio > 1.05) return { bg: '#FEE2E2', text: '#DC2626', bar: '#EF4444' };
  if (ratio >= 0.9) return { bg: '#FEF9C3', text: '#92400E', bar: '#F59E0B' };
  return { bg: '#DCFCE7', text: '#15803D', bar: '#22C55E' };
}

export default function ResourcesPage() {
  const { data, loading, error, refetch } = useApiData<ResourceData>('/resources');
  
  if (loading) return <LoadingSkeleton />;
  if (error || !data) return (
    <main style={{ padding: '32px', textAlign: 'center', color: '#ba1a1a' }}>
      <p>데이터 로드 실패: {error}</p>
      <button onClick={() => refetch(true)} style={{ marginTop: '16px', padding: '12px 24px', backgroundColor: '#1b2559', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>재시도</button>
    </main>
  );

  const stats = data.stats || { total_rate: 0, short_teams: [], free_teams: [], insight: '데이터 없음' };
  const totalRate = stats.total_rate || 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#F7F8FA' }}>

      {/* ── 헤더 ── */}
      <div style={{ padding: '24px 32px 16px', background: '#fff', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#1E293B', fontFamily: 'Manrope, sans-serif' }}>👥 인력투입현황</span>
          <span style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px' }}>· 2026 SDV시스템실 · 파싱 기준: 구글 시트 투입 명단(2026_PJT) 기반 AI 자동 분석</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
            <span>👤 총 인원: {data.total_headcount?.total || 0}명</span>
            <span>(정규직: {data.total_headcount?.regular || 0}명, 인턴: {data.total_headcount?.intern || 0}명)</span>
            <button onClick={() => refetch(true)} style={{ padding: '4px 10px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span> 동기화
            </button>
          </div>
        </div>

        {/* ── 실 전체 요약 브리핑 ── */}
        <div style={{ 
          background: '#F8FAFC', borderRadius: 12, padding: '16px 20px', 
          border: '1px solid #E2E8F0', display: 'flex', gap: 24, alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ flex: '0 0 160px', textAlign: 'center', borderRight: '1px solid #E2E8F0', paddingRight: 20 }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 700 }}>실 통합 가동률</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: totalRate > 100 ? '#EF4444' : '#10B981', letterSpacing: '-0.5px' }}>
              {totalRate.toFixed(1)}<span style={{ fontSize: 16, fontWeight: 700 }}>%</span>
            </div>
            <div style={{ fontSize: 10, color: totalRate > 100 ? '#EF4444' : '#10B981', marginTop: 2, fontWeight: 600 }}>
              {totalRate > 100 ? '⚠️ 정원 초과' : '✅ 운영 적정'}
            </div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', gap: 30 }}>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6, fontWeight: 700 }}>🔴 보충 시급 (Shortage)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {stats.short_teams?.length > 0 ? (
                  stats.short_teams.map(id => (
                    <span key={id} style={{ background: '#FEE2E2', color: '#B91C1C', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, border: '1px solid #FCA5A5' }}>
                      {id}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: '#CBD5E1' }}>없음</span>
                )}
              </div>
            </div>
            
            <div style={{ minWidth: 120 }}>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6, fontWeight: 700 }}>🟢 지원 가능 (Surplus)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {stats.free_teams?.length > 0 ? (
                  stats.free_teams.map(id => (
                    <span key={id} style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, border: '1px solid #86EFAC' }}>
                      {id}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: '#CBD5E1' }}>없음</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1.5, background: '#fff', borderRadius: 10, padding: '12px 16px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, color: '#6366F1', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#6366F1' }}>lightbulb</span> 실 전체 운영 인사이트
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
              {stats.insight || data.ai_insight || 'AI 분석 인사이트 생성 중입니다.'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 본문 영역 (스크롤) ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        
        {/* 팀 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, paddingBottom: '24px' }}>
          {(data.team_loads || []).map(t => {
            const ratio = t.load_rate / 100;
            const col = utilColor(ratio);
            const teamColor = TEAM_COLOR[t.team] || TEAM_COLOR['기타'];
            
            return (
              <div key={t.team}
                style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px',
                  border: `1px solid ${teamColor}30`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: teamColor, display: 'inline-block' }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{t.team}</span>
                  <span style={{ fontSize: 12, color: col.text, background: col.bg, padding: '2px 8px', borderRadius: 12, fontWeight: 700, marginLeft: 'auto' }}>
                    {t.status}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 8, background: '#E2E8F0', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${Math.min(t.load_rate, 100)}%`, background: col.bar, borderRadius: 99 }} />
                  </div>
                  <span style={{ color: col.text, fontSize: 14, fontWeight: 800, width: '40px', textAlign: 'right' }}>
                    {(t.load_rate).toFixed(0)}%
                  </span>
                </div>
                
                <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
                  필요 공수: <span style={{ fontWeight: 600, color: '#1E293B' }}>{t.total_mm} M/M</span><br />
                  가용 여력: <span style={{ fontWeight: 600, color: '#1E293B' }}>{t.available_mm} M/M</span>
                  {t.hire_needed > 0 && (
                    <div style={{ marginTop: '4px', color: '#EF4444', fontWeight: 600 }}>
                      ⚠️ {t.hire_needed} M/M 초과 상태
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── AI 심층 통찰 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
              
          {/* 과부하 경고 */}
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{background: '#FEF2F2', padding: 10, borderRadius: 10, display: 'flex'}}><span style={{ fontSize: 20 }}>🚨</span></div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', margin: 0, marginBottom: 4 }}>팀 가동률 집중 점검 (Over-allocation)</h4>
                <span style={{ fontSize: 13, color: '#94A3B8' }}>가동률 임계점 초과 및 병목 모니터링</span>
              </div>
            </div>
            
            {(data.overAllocation?.teams?.length && data.overAllocation.teams.length > 0) ? (
              <div style={{ background: '#F8FAFC', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #EF4444' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  AI 심층 분석 원인 (Why?)
                </span>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  <b>대상:</b> <span style={{ color: '#EF4444', fontWeight: 600 }}>{data.overAllocation.teams.join(', ')}</span><br/>
                  <span style={{ display: 'block', marginTop: '4px' }}>{data.overAllocation.analysis}</span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#10B981', background: '#F0FDF4', padding: '16px', borderRadius: '8px', fontWeight: 600, border: '1px solid #BBF7D0', margin: 0 }}>
                🌟 현재 위험 수위(100% 초과) 과부하 팀은 없습니다.
              </p>
            )}
          </div>

          {/* 여유 리소스 점검 */}
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{background: '#F0FDF4', padding: 10, borderRadius: 10, display: 'flex'}}><span style={{ fontSize: 20 }}>💡</span></div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', margin: 0, marginBottom: 4 }}>여유 리소스 재배치 기회 (Surplus)</h4>
                <span style={{ fontSize: 13, color: '#94A3B8' }}>가동률 60% 미만 잉여 조직 모니터링</span>
              </div>
            </div>
            
            {(data.idleResource?.teams?.length && data.idleResource.teams.length > 0) ? (
              <div style={{ background: '#F8FAFC', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #10B981' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  AI 심층 분석 통찰
                </span>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  <b>기회팀:</b> <span style={{ color: '#10B981', fontWeight: 600 }}>{data.idleResource.teams.join(', ')}</span><br/>
                  <span style={{ display: 'block', marginTop: '4px' }}>{data.idleResource.analysis}</span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#F59E0B', background: '#FFFBEB', padding: '16px', borderRadius: '8px', fontWeight: 600, border: '1px solid #FDE68A', margin: 0 }}>
                🌟 현재 큰 여유가 있는(60% 미만) 팀은 감지되지 않았습니다.
              </p>
            )}
          </div>
        </div>
        
        {data.reallocation_ideas && data.reallocation_ideas.length > 0 && (
          <div style={{ marginTop: 24, background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#6366F1' }}>shuffle</span> 
              추가적인 인력 재배치 아이디어
            </h4>
            <ul style={{ margin: 0, paddingLeft: '24px', color: '#475569', fontSize: '13px', lineHeight: 1.7 }}>
              {data.reallocation_ideas.map((idea, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{idea}</li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

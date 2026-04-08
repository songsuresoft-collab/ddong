'use client';
import React, { useState, useMemo } from 'react';
import { useApiData } from '../hooks/useApiData';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface Project { 
  name: string; pm?: string; team: string; client: string; 
  risk_level: string; delay_reason: string | null; progress: number; 
  status: string; start_date?: string; end_date?: string; 
}
interface RiskData { 
  success: boolean; 
  projects: Project[]; 
  risk_summary: { high: number; medium: number; low: number }; 
  ai_insight: string; 
  overBudget?: { count: number; analysis: string };
  pmBottleneck?: { topPm: string; analysis: string };
  stats?: {
    total_projects: number;
    delayed_projects: number;
    kpi_projects: number;
    health: { normal: number; caution: number; danger: number };
  };
  raw?: string; 
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  '6.진행중':       { bg: '#DBEAFE', color: '#1D4ED8' },
  '5.마감':         { bg: '#EDE9FE', color: '#7C3AED' },
  '4.협상':         { bg: '#FEF3C7', color: '#D97706' },
  '3.제안':         { bg: '#FEE2E2', color: '#DC2626' },
  '2.요구사항파악': { bg: '#F3F4F6', color: '#6B7280' },
  '진행중':         { bg: '#DBEAFE', color: '#1D4ED8' },
  '지연':           { bg: '#FEE2E2', color: '#DC2626' },
  '완료':           { bg: '#DCFCE7', color: '#15803D' },
  '제안중':         { bg: '#F3F4F6', color: '#6B7280' },
};

function barColor(p: number) {
  if (p >= 100) return '#22C55E';
  if (p >= 70)  return '#6366F1';
  if (p >= 40)  return '#F59E0B';
  if (p > 0)    return '#3B82F6';
  return '#CBD5E1';
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div style={{ 
      backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(3,14,68,0.06)',
      display: 'flex', alignItems: 'center', gap: '16px', flex: 1
    }}>
      <div style={{ backgroundColor: `${color}15`, color, padding: '10px', borderRadius: '10px', display: 'flex' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#767680', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#030e44' }}>{value}</div>
      </div>
    </div>
  );
}

function StatusDonut({ normal, caution, danger }: { normal: number; caution: number; danger: number }) {
  const total = normal + caution + danger || 1;
  const p1 = (normal / total) * 100;
  const p2 = (caution / total) * 100;
  const size = 60;
  const radius = 25;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dash3 = circumference;
  const dash2 = (p2 + p1) * (circumference / 100);
  const dash1 = p1 * (circumference / 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#fff', padding: '12px 20px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(3,14,68,0.06)', flex: '0 0 auto' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#ba1a1a" strokeWidth="8" strokeDasharray={`${dash3} ${circumference}`} />
          <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#f9a825" strokeWidth="8" strokeDasharray={`${dash2} ${circumference}`} />
          <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#2e7d32" strokeWidth="8" strokeDasharray={`${dash1} ${circumference}`} />
          <circle cx={center} cy={center} r={radius} fill="#fff" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#030e44' }}>
          {normal + caution + danger}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {[
          { color: '#2e7d32', label: '정상', val: normal },
          { color: '#f9a825', label: '주의', val: caution },
          { color: '#ba1a1a', label: '위험', val: danger }
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color }} />
            <span style={{ color: '#767680', width: '25px' }}>{s.label}</span>
            <span style={{ color: '#030e44' }}>{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { data, loading, error, refetch } = useApiData<RiskData>('/projects');
  
  const [search, setSearch] = useState('');
  const [filterPm, setFilterPm] = useState('All');
  const [filterStat, setFilterStat] = useState('All');

  const filtered = useMemo(() => {
    if (!data?.projects) return [];
    const q = search.trim().toLowerCase();
    return data.projects.filter(p => {
      const pPm = p.pm || '미지정';
      const matchPm   = filterPm   === 'All' || pPm === filterPm;
      const matchStat = filterStat === 'All' || p.status === filterStat;
      const matchQ    = !q || p.name.toLowerCase().includes(q) || pPm.toLowerCase().includes(q) || p.status.toLowerCase().includes(q);
      return matchPm && matchStat && matchQ;
    });
  }, [data, search, filterPm, filterStat]);

  const ALL_PMS = useMemo(() => {
    if (!data?.projects) return [];
    return Array.from(new Set(data.projects.map(p => p.pm || '미지정'))).sort();
  }, [data]);

  const ALL_STATUSES = useMemo(() => {
    if (!data?.projects) return [];
    return Array.from(new Set(data.projects.map(p => p.status)));
  }, [data]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return (
    <main style={{ padding: '32px', textAlign: 'center', color: '#ba1a1a' }}>
      <p>데이터 로드 실패: {error}</p>
      <button onClick={() => refetch(true)} style={{ marginTop: '16px', padding: '12px 24px', backgroundColor: '#1b2559', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>재시도</button>
    </main>
  );

  const rs = data.risk_summary || { high: 0, medium: 0, low: 0 };

  const selectStyle: React.CSSProperties = {
    fontSize: 12, padding: '6px 10px', border: '1px solid #E2E8F0',
    borderRadius: 6, background: '#fff', color: '#374151',
    cursor: 'pointer', outline: 'none', height: 34,
  };

  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#64748B', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap',
    background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 2,
  };

  const hl = (text: string) => {
    if (!search.trim()) return <>{text}</>;
    const q = search.trim();
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#FEF08A', borderRadius: 2, padding: '0 2px' }}>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <main style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#030e44', fontFamily: 'Manrope, sans-serif' }}>과제 &amp; 리스크</h1>
          <p style={{ margin: '4px 0 0', color: '#767680', fontSize: '14px' }}>AI Semantic 리스크 분류 및 지연 사유 추출</p>
        </div>
        <button onClick={() => refetch(true)} style={{ backgroundColor: '#1b2559', color: '#fff', padding: '10px 20px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: loading ? 'spin 1s linear infinite' : 'none' }}>refresh</span>{loading ? 'AI 재분석 중...' : 'AI 재분석'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
        {/* 대시보드 통계 위젯 */}
        <section style={{ display: 'flex', gap: '16px' }}>
          <StatCard label="진행 중 프로젝트" value={data.stats?.total_projects || data.projects.length} icon="folder_special" color="#3B82F6" />
          <StatCard label="지연 프로젝트" value={data.stats?.delayed_projects || rs.high} icon="report_problem" color="#EF4444" />
          <StatCard label="이번 달 완료 예정 (KPI)" value={data.stats?.kpi_projects || 0} icon="verified" color="#10B981" />
          <StatusDonut 
            normal={data.stats?.health.normal || rs.low} 
            caution={data.stats?.health.caution || rs.medium} 
            danger={data.stats?.health.danger || rs.high} 
          />
        </section>

        {/* AI 인사이트 브리핑 */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0', boxShadow: '0 1px 4px rgba(3,14,68,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px 28px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ color: '#8980ff', fontVariationSettings: "'FILL' 1", flexShrink: 0 }}>auto_awesome</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#030e44', fontFamily: 'Manrope, sans-serif' }}>✨ AI 프로젝트 현황 브리핑</h3>
                <span style={{ fontSize: '11px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: '4px', padding: '2px 8px', fontWeight: 600 }}>실시간 자동 분석</span>
              </div>
              <p style={{ margin: 0, color: '#181c21', lineHeight: 1.7, fontSize: '14px', fontWeight: 500 }}>{data.ai_insight || '분석 중입니다.'}</p>
            </div>
          </div>
          
          {(data.overBudget || data.pmBottleneck) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#E2E8F0', borderTop: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#FAFAFA', padding: '16px 28px' }}>
                {data.overBudget ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#DC2626', fontSize: '18px' }}>payments</span>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#DC2626' }}>예산/비용 리스크</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>{data.overBudget.analysis}</p>
                  </>
                ) : <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>예산 리스크 미감지</div>}
              </div>
              <div style={{ backgroundColor: '#FAFAFA', padding: '16px 28px' }}>
                {data.pmBottleneck ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#D97706', fontSize: '18px' }}>person_alert</span>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#D97706' }}>PM 병목 분석</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>{data.pmBottleneck.analysis}</p>
                  </>
                ) : <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>병목 리스크 미감지</div>}
              </div>
            </div>
          )}
        </section>

        {/* 프로젝트 테이블 */}
        <section style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(3,14,68,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
          {/* 테이블 헤더 & 필터 바 */}
          <div style={{ padding: '12px 20px', background: '#fff', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>📋 2026 SDV시스템실 프로젝트 현황</span>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>· {filtered.length}/{data.projects.length}건 표시 중</span>
              <span style={{ fontSize: 11, background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
                📅 현재 기준 데이터 동기화 완료
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 12, color: '#64748B' }}>
                <span>✅ 100%+: {data.projects.filter(p => (p.progress||0) >= 100).length}건</span>
                <span>🔵 진행중: {data.projects.filter(p => (p.progress||0) > 0 && (p.progress||0) < 100).length}건</span>
                <span>⬜ 미착수: {data.projects.filter(p => (p.progress||0) === 0).length}건</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #E2E8F0', borderRadius: 6, background: '#fff', padding: '0 10px', height: 34, flex: '1 1 200px', maxWidth: 320 }}>
                <span style={{ fontSize: 14, color: '#9CA3AF' }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="프로젝트명 · 담당자 · 상태 검색..."
                  style={{ border: 'none', outline: 'none', fontSize: 12, color: '#374151', width: '100%', background: 'transparent' }} />
                {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>}
              </div>
              <select value={filterPm} onChange={e => setFilterPm(e.target.value)} style={selectStyle}>
                <option value="All">담당자 전체</option>
                {ALL_PMS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
              </select>
              <select value={filterStat} onChange={e => setFilterStat(e.target.value)} style={selectStyle}>
                <option value="All">상태 전체</option>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {(search || filterPm !== 'All' || filterStat !== 'All') && (
                <button onClick={() => { setSearch(''); setFilterPm('All'); setFilterStat('All'); }}
                  style={{ fontSize: 12, padding: '6px 12px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 6, cursor: 'pointer', height: 34 }}>
                  ✕ 초기화
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', gap: 8, padding: '60px 0' }}>
                <span style={{ fontSize: 32 }}>🔍</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>검색 결과가 없습니다</span>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 800 }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={th}>작업명</th>
                    <th style={th}>담당자(PM)</th>
                    <th style={th}>팀/고객사</th>
                    <th style={th}>착수일</th>
                    <th style={th}>종료일</th>
                    <th style={th}>상태</th>
                    <th style={th}>진행률 (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const prog  = Math.min(t.progress || 0, 100);
                    const badge = STATUS_BADGE[t.status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                    return (
                      <tr key={i}
                        style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F1F5F9', transition: 'background 0.1s', cursor: 'default' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA')}
                      >
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span title={t.name}>{hl(t.name)}</span>
                            {t.risk_level === 'high' && (
                              <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#DC2626', padding: '2px 6px', borderRadius: '4px', border: '1px solid #FCA5A5', fontWeight: 800 }}>🚨 고위험</span>
                            )}
                          </div>
                          {t.delay_reason && (
                            <div style={{ fontSize: '10px', color: '#DC2626', marginTop: '4px', whiteSpace: 'normal', fontWeight: 500 }}>
                              ⚠️ {t.delay_reason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>{hl(t.pm || '-')}</td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600 }}>{hl(t.team)}</div>
                          <div style={{ fontSize: '10px', color: '#94A3B8' }}>{hl(t.client)}</div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: '#6366F1', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.start_date || '-'}</td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: '#EF4444', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.end_date || '-'}</td>
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: badge.bg, color: badge.color, borderRadius: 4, padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>{t.status}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${prog}%`, background: barColor(prog), borderRadius: 999, transition: 'width 0.4s ease' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: barColor(prog), minWidth: 45, textAlign: 'right', flexShrink: 0 }}>
                              {prog.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

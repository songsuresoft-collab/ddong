'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── 타입 정의 ───────────────────────────────────────────────
interface Project {
  project: string;
  status: '순조로움' | '병목 발생' | '지연 위험';
  progress?: number | null;
  assignee?: string;
  ai_comment?: string | null;
  this_week?: string | null;
  next_week?: string | null;
  bottleneck?: string | null;
}

interface DashboardData {
  last_updated: string;
  overall_summary: string;
  stats: { name: string; value: number }[];
  teams: { [teamName: string]: Project[] };
  recent_week_details: {
    week: string;
    highlights: string[];
    risks: string[];
    team_spotlights?: { [team: string]: string };
  };
}

// ─── 상수 정의 ───────────────────────────────────────────────
const TEAMS = ['SDV솔루션 1팀', 'SDV솔루션 2팀', 'SDV솔루션 3팀', 'SDV솔루션 4팀'] as const;
const TEAM_SHORT: Record<string, string> = {
  'SDV솔루션 1팀': 'SS1',
  'SDV솔루션 2팀': 'SS2',
  'SDV솔루션 3팀': 'SS3',
  'SDV솔루션 4팀': 'SS4',
};
const TEAM_COLORS: Record<string, string> = {
  'SDV솔루션 1팀': '#6366f1',
  'SDV솔루션 2팀': '#06b6d4',
  'SDV솔루션 3팀': '#10b981',
  'SDV솔루션 4팀': '#f59e0b',
};
const STATUS_CONFIG = {
  '순조로움': { color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', label: '순조로움', dot: '🟢' },
  '병목 발생': { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: '병목 발생', dot: '🟡' },
  '지연 위험': { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: '지연 위험', dot: '🔴' },
} as const;

const DONUT_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

// ─── 서브 컴포넌트: 텍스트 줄바꿈 처리 ─────────────────────
function FormattedText({ text, className = "" }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  
  const formatted = text
    .replace(/ㄴ/g, '\nㄴ')
    .replace(/\s-/g, '\n-')
    .replace(/\]\s*-/g, ']\n-')
    .trim();

  return (
    <p className={`whitespace-pre-wrap ${className}`}>
      {formatted}
    </p>
  );
}

// ─── 서브 컴포넌트: 진행률 바 ────────────────────────────────
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─── 서브 컴포넌트: 상태 뱃지 ───────────────────────────────
function StatusBadge({ status }: { status: '순조로움' | '병목 발생' | '지연 위험' }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {status}
    </span>
  );
}

// ─── 서브 컴포넌트: 프로젝트 카드 ───────────────────────────
function ProjectCard({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[project.status];
  const hasExpandable = !!(project.next_week || project.bottleneck);

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md group ${
        project.bottleneck ? 'border-red-200' : 'border-slate-100'
      }`}
    >
      {/* 왼쪽 상태 컬러 바 */}
      <div className="flex">
        <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ backgroundColor: cfg.color }} />
        <div className="flex-1 p-4">

          {/* 헤더: 프로젝트명 + 상태 뱃지 */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-slate-700 text-sm leading-tight group-hover:text-indigo-600 transition-colors flex-1">
              {project.project}
            </h3>
            <StatusBadge status={project.status} />
          </div>

          {/* AI 한줄평 */}
          {project.ai_comment && (
            <div className="flex items-start gap-1.5 mb-3 px-2.5 py-2 rounded-xl"
              style={{ backgroundColor: `${cfg.color}10`, border: `1px solid ${cfg.color}25` }}>
              <span className="text-[11px] flex-shrink-0" style={{ color: cfg.color }}>✦ AI</span>
              <p className="text-[11px] leading-snug font-medium" style={{ color: cfg.color }}>
                {project.ai_comment}
              </p>
            </div>
          )}

          {/* 진행률 */}
          {project.progress != null && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>진행률</span>
                <span className="font-bold" style={{ color: cfg.color }}>{project.progress}%</span>
              </div>
              <ProgressBar value={project.progress} color={cfg.color} />
            </div>
          )}

          {/* 담당자 */}
          {project.assignee && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="material-symbols-outlined text-slate-300" style={{ fontSize: '14px' }}>person</span>
              <span className="text-xs text-slate-400">{project.assignee}</span>
            </div>
          )}

          {/* 금주 수행 내용 (항상 표시) */}
          {project.this_week ? (
            <div className="p-2.5 bg-slate-50 rounded-xl mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">📌 금주 수행</p>
              <FormattedText text={project.this_week} className="text-xs text-slate-600 leading-relaxed" />
            </div>
          ) : (
            <div className="p-2.5 bg-slate-50 rounded-xl mb-2">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">📌 금주 수행 내용 없음</p>
            </div>
          )}

          {/* 차주 계획 / Bottleneck 접기·펼치기 */}
          {hasExpandable && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-indigo-400 hover:text-indigo-600 font-semibold transition-colors mt-1 flex items-center gap-0.5"
            >
              {expanded ? '▲ 접기' : '▼ 차주 수행 계획 보기'}
            </button>
          )}

          {/* 확장 영역 */}
          {expanded && (
            <div className="mt-2 space-y-2">
              {project.next_week && (
                <div className="p-2.5 bg-indigo-50 rounded-xl">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">🗓 차주 수행 계획</p>
                  <FormattedText text={project.next_week} className="text-xs text-indigo-700 leading-relaxed" />
                </div>
              )}
              {!project.next_week && (
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">🗓 차주 수행 계획 없음</p>
                </div>
              )}
              {project.bottleneck && (
                <div className="p-2.5 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-400 flex-shrink-0" style={{ fontSize: '14px' }}>warning</span>
                  <div>
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Bottleneck</p>
                    <FormattedText text={project.bottleneck} className="text-xs text-red-700 leading-relaxed" />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function WeeklyProgressPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<string>(TEAMS[0]);

  const fetchData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weekly-progress/dashboard?force=${force}`);
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      const result = await res.json();
      setData(result);
      // 첫 번째로 프로젝트가 있는 팀을 기본 활성 탭으로 설정
      for (const t of TEAMS) {
        if (result.teams?.[t]?.length > 0) {
          setActiveTeam(t);
          break;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 총 프로젝트 수
  const totalProjects = useMemo(() => {
    if (!data) return 0;
    return data.stats.reduce((sum, s) => sum + s.value, 0);
  }, [data]);

  // ─ 로딩 상태 ─
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 bg-slate-50">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-400" style={{ fontSize: '18px' }}>analytics</span>
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-slate-700 font-semibold">NotebookLM 데이터 분석 중...</p>
          <p className="text-slate-400 text-sm">최신 주차 데이터를 AI가 분석하고 있습니다</p>
        </div>
      </div>
    );
  }

  // ─ 오류 상태 ─
  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] bg-slate-50">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 text-center max-w-md">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-400" style={{ fontSize: '28px' }}>error</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">데이터 로드 실패</h2>
          <p className="text-slate-500 text-sm mb-6">{error || '알 수 없는 오류가 발생했습니다.'}</p>
          <button
            onClick={() => fetchData(true)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const activeProjects = data.teams[activeTeam] || [];
  const teamColor = TEAM_COLORS[activeTeam] || '#6366f1';

  return (
    <main className="min-h-screen bg-slate-50 p-6 space-y-6">
      
      {/* ══════════════════════════════════════════════
          헤더
      ══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">주간 진도 대시보드</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-slate-400 font-medium">
              최신 데이터: <span className="text-slate-600 font-semibold">{data.last_updated}</span>
            </span>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '16px', animation: loading ? 'spin 1s linear infinite' : 'none' }}>refresh</span>
          {loading ? 'AI 재분석 중...' : 'AI 재분석'}
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          상단 통계 섹션 (3열 그리드)
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 전체 AI 요약 카드 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-500" style={{ fontSize: '16px' }}>auto_awesome</span>
            </div>
            <h2 className="font-bold text-slate-700 text-sm">AI 종합 인사이트</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed italic border-l-2 border-indigo-200 pl-3">
            &ldquo;{data.overall_summary}&rdquo;
          </p>

          {/* 팀별 미니 스포트라이트 */}
          {data.recent_week_details.team_spotlights && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
              {TEAMS.map((team) => {
                const spotlight = data.recent_week_details.team_spotlights?.[team];
                if (!spotlight) return null;
                return (
                  <div
                    key={team}
                    className="p-2.5 rounded-xl border"
                    style={{ backgroundColor: `${TEAM_COLORS[team]}08`, borderColor: `${TEAM_COLORS[team]}30` }}
                  >
                    <span
                      className="text-[10px] font-black uppercase tracking-wider block mb-1"
                      style={{ color: TEAM_COLORS[team] }}
                    >
                      {TEAM_SHORT[team]}
                    </span>
                    <p className="text-xs text-slate-600 leading-snug line-clamp-2">{spotlight}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 상태 분포 도넛 차트 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '16px' }}>donut_large</span>
            </div>
            <h2 className="font-bold text-slate-700 text-sm">프로젝트 상태 분포</h2>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.stats.filter(s => s.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                >
                  {data.stats.filter(s => s.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[data.stats.findIndex(s => s.name === entry.name)]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [`${value}건`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* 범례 */}
          <div className="flex justify-around mt-1">
            {data.stats.map((s, i) => (
              <div key={s.name} className="flex flex-col items-center gap-0.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i] }} />
                <span className="text-[10px] text-slate-400 font-medium">{s.name}</span>
                <span className="text-base font-black" style={{ color: DONUT_COLORS[i] }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          최신 주차 스포트라이트 (Dark 섹션)
      ══════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl overflow-hidden relative">
        {/* 배경 장식 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative">
          {/* 섹션 헤더 */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-extrabold">최신 주차 상세 현황</h2>
              <p className="text-indigo-300 text-xs font-semibold mt-0.5 uppercase tracking-widest">
                {data.recent_week_details.week}
              </p>
            </div>
            <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl">
              <span className="text-xs text-slate-300 font-semibold">SDV시스템실 통합 보고</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 핵심 성과 */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-4 h-0.5 bg-emerald-400 rounded" />
                Main Highlights
              </h3>
              <ul className="space-y-2.5">
                {data.recent_week_details.highlights.map((h, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="w-5 h-5 flex-shrink-0 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-slate-300 text-xs leading-relaxed">{h}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* 주요 리스크 */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-4 h-0.5 bg-red-400 rounded" />
                Key Risks &amp; Issues
              </h3>
              <div className="space-y-2">
                {data.recent_week_details.risks.map((risk, i) => (
                  <div
                    key={i}
                    className="flex gap-2 items-start p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl"
                  >
                    <span className="material-symbols-outlined text-red-400 flex-shrink-0" style={{ fontSize: '14px' }}>
                      report_problem
                    </span>
                    <p className="text-slate-300 text-xs leading-relaxed">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          팀별 탭 + 프로젝트 카드
      ══════════════════════════════════════════════ */}
      <section>
        {/* 팀 탭 네비게이션 */}
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1 shadow-sm border border-slate-100 mb-5 w-fit">
          {TEAMS.map(team => {
            const isActive = activeTeam === team;
            const count = data.teams[team]?.length || 0;
            return (
              <button
                key={team}
                onClick={() => setActiveTeam(team)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
                style={isActive ? { backgroundColor: TEAM_COLORS[team] } : {}}
              >
                <span>{TEAM_SHORT[team]}</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 선택된 팀 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-1.5 h-8 rounded-full"
            style={{ backgroundColor: teamColor }}
          />
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">{activeTeam}</h2>
            <p className="text-xs text-slate-400">{activeProjects.length}개 진행 프로젝트</p>
          </div>
          {/* 팀 상태 요약 뱃지 */}
          <div className="ml-auto flex gap-2">
            {(['순조로움', '병목 발생', '지연 위험'] as const).map(status => {
              const count = activeProjects.filter(p => p.status === status).length;
              if (count === 0) return null;
              return (
                <div
                  key={status}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: STATUS_CONFIG[status].bg,
                    color: STATUS_CONFIG[status].color,
                    border: `1px solid ${STATUS_CONFIG[status].border}`,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG[status].color }} />
                  {status} {count}
                </div>
              );
            })}
          </div>
        </div>

        {/* 프로젝트 카드 그리드 */}
        {activeProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProjects.map((proj, idx) => (
              <ProjectCard key={idx} project={proj} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-100">
            <div className="text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
              <p className="text-sm font-medium">이 팀의 프로젝트 데이터가 없습니다</p>
            </div>
          </div>
        )}
      </section>

      {/* 하단 여백 */}
      <div className="h-4" />
    </main>
  );
}

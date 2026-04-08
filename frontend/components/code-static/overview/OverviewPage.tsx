'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend,
} from 'recharts';
import type { RulesetReport, RuleSummary, FileSummary, DrawerState } from '@/types/code-static';
import { getRulesetReportsBySession, getSessions } from '@/utils/code-static/db';
import RuleDetailDrawer from '../common/RuleDetailDrawer';

const CHART_COLORS = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#74b9ff', '#55efc4', '#e17055', '#a29bfe'];

/* ───────── Micro KPI tile ───────── */
interface KpiTileProps {
    icon: string;
    iconClass: string;
    label: string;
    value: string;
    sub?: string;
}
const KpiTile: React.FC<KpiTileProps> = ({ icon, iconClass, label, value, sub }) => (
    <div className="kpi-card">
        <div className="kpi-card-header">
            <span className={`material-symbols-outlined ${iconClass}`}>{icon}</span>
            <div className="kpi-label">{label}</div>
        </div>
        <div className="kpi-value">{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
);

const OverviewPage: React.FC = () => {
    const searchParams = useSearchParams();
    const [reports, setReports] = useState<RulesetReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionLabel, setSessionLabel] = useState('');
    const [drawer, setDrawer] = useState<DrawerState>({
        isOpen: false, ruleName: null, sessionId: null, compareSessionId: null,
    });

    const sessionId = searchParams.get('session');

    useEffect(() => {
        (async () => {
            if (!sessionId) {
                const sessions = await getSessions();
                if (sessions.length === 0) { setLoading(false); return; }
                sessions.sort((a, b) => b.createdAt - a.createdAt);
                const latest = sessions[0];
                setReports(await getRulesetReportsBySession(latest.id));
                setSessionLabel(latest.analysisId);
            } else {
                setReports(await getRulesetReportsBySession(sessionId));
                const sessions = await getSessions();
                const s = sessions.find(s => s.id === sessionId);
                setSessionLabel(s?.analysisId || sessionId);
            }
            setLoading(false);
        })();
    }, [sessionId]);

    if (loading) return <div className="empty-state"><div className="spinner" /></div>;
    if (reports.length === 0) return (
        <div className="empty-state fade-in">
            <div className="empty-state-icon">📊</div>
            <h3 className="empty-state-title">데이터가 없습니다</h3>
            <p className="empty-state-text">세션을 선택하거나 새 세션을 업로드하세요.</p>
        </div>
    );

    /* ── Aggregate KPIs ── */
    const totalFiles      = reports.reduce((s, r) => s + r.summary.totalFiles, 0);
    const analyzedFiles   = reports.reduce((s, r) => s + r.summary.analyzedFiles, 0);
    const totalFunctions  = reports.reduce((s, r) => s + r.summary.totalFunctions, 0);
    const loc             = reports.reduce((s, r) => s + r.summary.lineOfCode, 0);

    /* ── Ruleset table (deduplicated) ── */
    const rulesetMap = new Map<string, { remaining: number; suppressed: number }>();
    reports.forEach(r => {
        const rs = r.rulesetSummary;
        const ex = rulesetMap.get(rs.ruleset);
        if (ex) {
            ex.remaining  = Math.max(ex.remaining,  rs.remaining);
            ex.suppressed = Math.max(ex.suppressed, rs.suppressed);
        } else {
            rulesetMap.set(rs.ruleset, { remaining: rs.remaining, suppressed: rs.suppressed });
        }
    });
    const rulesetData = Array.from(rulesetMap.entries()).map(([ruleset, v]) => ({ ruleset, ...v }));
    const totalRemaining  = rulesetData.reduce((s, r) => s + r.remaining,  0);
    const totalSuppressed = rulesetData.reduce((s, r) => s + r.suppressed, 0);

    /* ── Pie data ── */
    const pieData = rulesetData.map((rs, i) => ({
        name: rs.ruleset, value: rs.remaining,
        fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    /* ── Top 10 Rules (deduplicated) ── */
    const ruleMap = new Map<string, RuleSummary & { ruleset: string }>();
    reports.forEach(r => r.rules.forEach(rule => {
        const ex = ruleMap.get(rule.rule);
        if (!ex || rule.remaining > ex.remaining) ruleMap.set(rule.rule, { ...rule, ruleset: r.ruleset });
    }));
    const topRules = Array.from(ruleMap.values()).sort((a, b) => b.remaining - a.remaining).slice(0, 10);

    /* ── Top 10 Files (deduplicated) ── */
    const fileMap = new Map<string, FileSummary & { ruleset: string }>();
    reports.forEach(r => r.files.forEach(f => {
        const ex = fileMap.get(f.file);
        if (!ex || f.remaining > ex.remaining) fileMap.set(f.file, { ...f, ruleset: r.ruleset });
    }));
    const topFiles = Array.from(fileMap.values()).sort((a, b) => b.remaining - a.remaining).slice(0, 10);

    const openDrawer = (ruleName: string) => setDrawer({
        isOpen: true, ruleName,
        sessionId: sessionId || reports[0]?.sessionId || null,
        compareSessionId: null,
    });

    const coveragePct = totalFiles > 0 ? Math.round(analyzedFiles / totalFiles * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100%' }}>

            {/* ══════════════════════════════════════════
                HERO HEADER — 타이틀 + 요약 뱃지 (static, 가림 없음)
            ══════════════════════════════════════════ */}
            <div style={{
                padding: '14px 24px 0',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                width: '100%',
                boxSizing: 'border-box',
            }}>
                {/* Top row: title + summary badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                    <div>
                        <h1 className="page-title">Overview — {sessionLabel}</h1>
                        <p className="page-subtitle">전체 분석 결과 요약</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{
                            padding: '7px 16px', background: 'var(--color-danger-bg)',
                            borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'var(--color-danger)',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            ⚠️ Remaining <strong>{totalRemaining.toLocaleString()}</strong>
                        </div>
                        <div style={{
                            padding: '7px 16px', background: 'var(--color-warning-bg)',
                            borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#c9920a',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            🔇 Suppressed <strong>{totalSuppressed.toLocaleString()}</strong>
                        </div>
                    </div>
                </div>

                {/* KPI 4개 — 헤더 하단에 나란히 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12,
                    marginBottom: 16,
                }}>
                    <KpiTile icon="description" iconClass="icon-description" label="Total Files"
                        value={totalFiles.toLocaleString()} />
                    <KpiTile icon="task_alt" iconClass="icon-task" label="Analyzed Files"
                        value={analyzedFiles.toLocaleString()}
                        sub={`${coveragePct}% coverage`} />
                    <KpiTile icon="functions" iconClass="icon-functions" label="Total Functions"
                        value={totalFunctions.toLocaleString()} />
                    <KpiTile icon="code" iconClass="icon-code" label="Lines of Code"
                        value={loc.toLocaleString()} />
                </div>
            </div>

            {/* ══════════════════════════════════════════
                BODY — 전체 폭 활용
            ══════════════════════════════════════════ */}
            <div className="page-body">

                {/* ── Row 1: 3-Column Grid ────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 2fr',
                    gap: 14,
                    width: '100%',
                    alignItems: 'stretch',
                }}>
                    {/* Col 1 — Ruleset Summary Table */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Ruleset Summary</h3>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rulesetData.length} rulesets</span>
                        </div>
                        <div className="data-table-wrapper">
                            <table className="data-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Ruleset</th>
                                        <th className="num">Remaining</th>
                                        <th className="num">Suppressed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rulesetData.map(rs => (
                                        <tr key={rs.ruleset}>
                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rs.ruleset}</td>
                                            <td className="num"><span className="badge badge-danger">{rs.remaining}</span></td>
                                            <td className="num"><span className="badge badge-warning">{rs.suppressed}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                                        <td style={{ fontWeight: 700, fontSize: 12 }}>TOTAL</td>
                                        <td className="num"><span className="badge badge-danger">{totalRemaining}</span></td>
                                        <td className="num"><span className="badge badge-warning">{totalSuppressed}</span></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Col 2 — Ruleset Distribution (Donut) */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="card-header">
                            <h3 className="card-title">Ruleset Distribution</h3>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>이슈 비율</span>
                        </div>
                        <div style={{ flex: 1, minHeight: 200 }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={80}
                                        dataKey="value" paddingAngle={3}>
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{
                                        background: '#1e2030', border: '1px solid #2a2d45',
                                        borderRadius: 8, fontSize: 12,
                                    }} />
                                    <Legend iconSize={10} iconType="circle"
                                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Summary stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                            <div style={{
                                background: 'var(--color-danger-bg)', borderRadius: 8,
                                padding: '8px 12px', textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-danger)' }}>
                                    {totalRemaining.toLocaleString()}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Remaining</div>
                            </div>
                            <div style={{
                                background: 'var(--color-warning-bg)', borderRadius: 8,
                                padding: '8px 12px', textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#c9920a' }}>
                                    {totalSuppressed.toLocaleString()}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Suppressed</div>
                            </div>
                        </div>
                    </div>

                    {/* Col 3 — Rule Top 10 Bar Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Rule Top 10 (Remaining)</h3>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>클릭 시 상세 보기</span>
                        </div>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topRules} layout="vertical"
                                    margin={{ left: 10, right: 8, top: 0, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="rule" type="category"
                                        stroke="#6b6f85" fontSize={11} width={88}
                                        tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + '…' : v}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: '#1e2030', border: '1px solid #2a2d45', borderRadius: 8, fontSize: 12 }}
                                        labelStyle={{ color: '#e8eaf0' }}
                                        formatter={(value: unknown) => [Number(value), 'Remaining']}
                                    />
                                    <Bar dataKey="remaining" radius={[0, 4, 4, 0]} barSize={20}
                                        cursor="pointer"
                                        onClick={(_: unknown, index: number) => openDrawer(topRules[index].rule)}
                                    >
                                        {topRules.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Row 2: File Top 10 — 전체 폭 */}
                <div className="card" style={{ width: '100%' }}>
                    <div className="card-header">
                        <h3 className="card-title">File Top 10 (Remaining)</h3>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>잔존 이슈 최다 파일</span>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}>#</th>
                                    <th>File Path</th>
                                    <th style={{ width: 120 }}>Ruleset</th>
                                    <th className="num" style={{ width: 80 }}>Rules</th>
                                    <th className="num" style={{ width: 110 }}>Remaining</th>
                                    <th className="num" style={{ width: 110 }}>Suppressed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topFiles.map((f, i) => (
                                    <tr key={i} style={{ cursor: 'default' }}>
                                        <td style={{ fontWeight: 700, color: 'var(--accent-primary-light)', fontSize: 13 }}>{i + 1}</td>
                                        <td style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                                            <span title={f.file}>
                                                {f.file.length > 60 ? '…' + f.file.slice(-59) : f.file}
                                            </span>
                                        </td>
                                        <td><span className="badge badge-info">{f.ruleset}</span></td>
                                        <td className="num">{f.ruleCount}</td>
                                        <td className="num"><span className="badge badge-danger">{f.remaining}</span></td>
                                        <td className="num"><span className="badge badge-warning">{f.suppressed}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <RuleDetailDrawer
                drawer={drawer}
                onClose={() => setDrawer(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default OverviewPage;

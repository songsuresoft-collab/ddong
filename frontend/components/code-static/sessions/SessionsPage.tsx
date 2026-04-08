'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@/types/code-static';
import { getSessions, deleteSession as dbDeleteSession } from '@/utils/code-static/db';
import { loadFixtures } from '@/utils/code-static/fixtureLoader';

const SessionsPage: React.FC = () => {
    const [loadingFixtures, setLoadingFixtures] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadSessions = async () => {
        setLoading(true);
        const all = await getSessions();
        all.sort((a, b) => b.createdAt - a.createdAt);
        setSessions(all);
        setLoading(false);
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('이 세션을 삭제하시겠습니까?')) return;
        await dbDeleteSession(id);
        await loadSessions();
    };

    const handleSelect = (session: Session) => {
        router.push(`/sdv-solution/code-static/overview?session=${session.id}`);
    };

    const handleLoadFixtures = async () => {
        setLoadingFixtures(true);
        await loadFixtures();
        await loadSessions();
        setLoadingFixtures(false);
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="flex-between">
                    <div>
                        <h1 className="page-title">Analysis Sessions</h1>
                        <p className="page-subtitle">회차별 분석 세션 관리 · 총 {sessions.length}개</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="btn btn-secondary"
                            onClick={handleLoadFixtures}
                            disabled={loadingFixtures}
                        >
                            {loadingFixtures ? '⏳ Loading...' : '🧪 Load Demo Data'}
                        </button>
                        <button className="btn btn-primary" onClick={() => router.push('/sdv-solution/code-static/upload')}>
                            📤 New Session
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {sessions.length === 0 ? (
                    <div className="empty-state fade-in">
                        <div className="empty-state-icon">📋</div>
                        <h3 className="empty-state-title">아직 세션이 없습니다</h3>
                        <p className="empty-state-text">
                            &quot;New Session&quot; 버튼을 클릭하여 Project Summary Report를 업로드하세요.
                        </p>
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button className="btn btn-primary" onClick={() => router.push('/sdv-solution/code-static/upload')}>
                                📤 첫 세션 만들기
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleLoadFixtures}
                                disabled={loadingFixtures}
                            >
                                {loadingFixtures ? '⏳ Loading...' : '🧪 데모 데이터 로드'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="session-grid stagger">
                        {sessions.map((session, index) => (
                            <div
                                key={session.id}
                                className="session-card"
                                onClick={() => handleSelect(session)}
                            >
                                {/* Top row: ID + date */}
                                <div className="session-card-top">
                                    <div className="session-card-id">{session.analysisId}</div>
                                    <div className="session-card-date">{formatDate(session.createdAt)}</div>
                                </div>

                                {/* Rulesets */}
                                <div className="session-card-rulesets">
                                    {session.rulesetNames.map(rs => (
                                        <span key={rs} className="badge badge-info">{rs}</span>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="session-card-actions">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleSelect(session)}
                                        style={{ flex: 1 }}
                                    >
                                        📊 Overview
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={(e) => handleDelete(session.id, e)}
                                        style={{ color: 'var(--color-danger)' }}
                                    >
                                        🗑
                                    </button>
                                </div>

                                {/* Sequence number badge */}
                                <div style={{
                                    position: 'absolute',
                                    top: 12,
                                    right: 14,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 6,
                                    padding: '2px 7px',
                                }}>
                                    #{index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionsPage;

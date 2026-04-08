'use client';
import { useApiData } from './hooks/useApiData';
import LoadingSkeleton from './components/LoadingSkeleton';
import { useState, useEffect, useCallback } from 'react';

/* ──────── 타입 정의 ──────── */
interface KeyIssue {
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  action: string;
}

interface KpiSnapshot {
  order_target: string;
  order_actual: string;
  order_rate: number;
  sales_target: string;
  sales_actual: string;
  sales_rate: number;
}

interface HomeData {
  success: boolean;
  summary: string;
  key_issues: KeyIssue[];
  kpi_snapshot: KpiSnapshot;
  risk_count: { high: number; medium: number; low: number };
  raw?: string;
}

/* ──────── 상수 ──────── */
const URGENCY_CONFIG = {
  high: {
    bg: 'linear-gradient(135deg, #ffdad6, #ffb4a8)',
    color: '#93000a',
    icon: 'error',
    border: '#ba1a1a',
    label: '긴급',
    glow: 'rgba(186, 26, 26, 0.15)',
  },
  medium: {
    bg: 'linear-gradient(135deg, #d0dcfe, #b8c8f8)',
    color: '#3b4762',
    icon: 'warning',
    border: '#515b92',
    label: '주의',
    glow: 'rgba(81, 91, 146, 0.12)',
  },
  low: {
    bg: 'linear-gradient(135deg, #e8eaf0, #d8dce6)',
    color: '#45464f',
    icon: 'info',
    border: '#767680',
    label: '참고',
    glow: 'rgba(118, 118, 128, 0.08)',
  },
};

/* ──────── 애니메이션 도넛 차트 ──────── */
function DonutChart({
  value,
  label,
  color,
  subLabel,
  delay = 0,
}: {
  value: number;
  label: string;
  color: string;
  subLabel?: string;
  delay?: number;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const end = Math.min(value, 100);
      const step = end / 40;
      const interval = setInterval(() => {
        start += step;
        if (start >= end) {
          setAnimatedValue(end);
          clearInterval(interval);
        } else {
          setAnimatedValue(Math.round(start));
        }
      }, 20);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const getGradientId = label.replace(/\s/g, '_');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: '140px', height: '140px' }}>
        <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={`grad_${getGradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="42" fill="none" stroke="#ebeef5" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={`url(#grad_${getGradientId})`}
            strokeWidth="8"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{
            fontSize: '26px', fontWeight: 800, color: '#030e44',
            fontFamily: 'Manrope, sans-serif',
          }}>
            {animatedValue}<span style={{ fontSize: '14px', fontWeight: 600 }}>%</span>
          </span>
          <span style={{ fontSize: '10px', color: '#767680', fontWeight: 500, letterSpacing: '0.5px' }}>
            달성률
          </span>
        </div>
      </div>
      <span style={{
        fontSize: '13px', fontWeight: 700, color: '#1B2559',
        fontFamily: 'Manrope, sans-serif',
      }}>
        {label}
      </span>
      {subLabel && (
        <span style={{ fontSize: '11px', color: '#767680', marginTop: '-8px' }}>{subLabel}</span>
      )}
    </div>
  );
}

/* ──────── 카운트업 컴포넌트 ──────── */
function CountUp({ end, duration = 1000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration / 20);
    const interval = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(interval);
      } else {
        setCount(Math.round(start));
      }
    }, 20);
    return () => clearInterval(interval);
  }, [end, duration]);
  return <>{count}{suffix}</>;
}

/* ──────── 메인 페이지 ──────── */
export default function HomePage() {
  const { data, loading, error, refetch, fromCache } = useApiData<HomeData>('/home');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (data) {
      setLastUpdate(new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    }
  }, [data]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch(true); // force=true: 캐시 무시하고 NotebookLM 즉시 재질의
    setIsRefreshing(false);
  }, [refetch]);

  if (loading) return <LoadingSkeleton />;

  if (error && !data) {
    return (
      <main style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{
          maxWidth: '500px', margin: '80px auto', padding: '48px',
          borderRadius: '16px', backgroundColor: '#fff',
          boxShadow: '0 4px 32px rgba(3,14,68,0.08)',
        }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: '56px', color: '#ba1a1a', display: 'block', marginBottom: '20px' }}
          >cloud_off</span>
          <h2 style={{ margin: '0 0 12px', color: '#030e44', fontFamily: 'Manrope, sans-serif' }}>
            일시적 연결 오류
          </h2>
          <p style={{ color: '#45464f', lineHeight: 1.6, fontSize: '14px', marginBottom: '24px' }}>
            {error}
          </p>
          <button
            onClick={handleRefresh}
            style={{
              padding: '14px 32px', backgroundColor: '#1b2559', color: '#fff',
              border: 'none', borderRadius: '12px', cursor: 'pointer',
              fontWeight: 700, fontSize: '14px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#030e44')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1b2559')}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  const homeData = data || {
    success: false, summary: '', key_issues: [],
    kpi_snapshot: {} as KpiSnapshot, risk_count: { high: 0, medium: 0, low: 0 }
  };

  const kpi = homeData.kpi_snapshot || {} as KpiSnapshot;
  const riskCount = homeData.risk_count || { high: 0, medium: 0, low: 0 };
  const orderRate = typeof kpi.order_rate === 'number' ? kpi.order_rate : 0;
  const salesRate = typeof kpi.sales_rate === 'number' ? kpi.sales_rate : 0;
  const totalRisk = (riskCount.high || 0) + (riskCount.medium || 0) + (riskCount.low || 0);

  return (
    <main style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ═══════ Hero: AI 실시간 브리핑 ═══════ */}
      <section>
        <div style={{
          background: 'linear-gradient(135deg, #030e44 0%, #1b2559 40%, #515b92 100%)',
          padding: '32px 36px', borderRadius: '16px', position: 'relative', overflow: 'hidden',
        }}>
          {/* 배경 장식 */}
          <div style={{
            position: 'absolute', top: '-60px', right: '-40px', width: '220px', height: '220px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(137,128,255,0.2), transparent)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-30px', left: '20%', width: '140px', height: '140px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(132,141,200,0.15), transparent)',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span className="material-symbols-outlined" style={{
                  color: '#8980ff', fontVariationSettings: "'FILL' 1", fontSize: '22px',
                }}>auto_awesome</span>
                <h2 style={{
                  margin: 0, fontSize: '18px', fontWeight: 700,
                  color: '#dee0ff', fontFamily: 'Manrope, sans-serif',
                  letterSpacing: '-0.3px',
                }}>
                  AI 실시간 브리핑
                </h2>
                {lastUpdate && (
                  <span style={{ fontSize: '11px', color: 'rgba(222,224,255,0.5)', fontWeight: 500, marginLeft: '4px' }}>
                    {lastUpdate} 업데이트
                  </span>
                )}
                {/* 캐시/실시간 배지 */}
                <span style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
                  padding: '2px 8px', borderRadius: '9999px',
                  backgroundColor: fromCache ? 'rgba(255,255,255,0.1)' : 'rgba(137,128,255,0.3)',
                  color: fromCache ? 'rgba(222,224,255,0.5)' : '#dee0ff',
                  border: fromCache ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(137,128,255,0.5)',
                }}>
                  {fromCache ? '📦 캐시' : '🔴 실시간'}
                </span>
              </div>
              <p style={{
                color: 'rgba(222,224,255,0.6)', fontWeight: 500, marginBottom: '16px',
                fontSize: '12px', margin: '0 0 16px',
              }}>
                SDV시스템실 종합 현황 및 주요 인사이트
              </p>
              <div style={{
                color: '#ffffff', lineHeight: 1.7, fontSize: '15px',
                backgroundColor: 'rgba(255,255,255,0.08)', padding: '18px 20px', borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                borderLeft: '3px solid #8980ff',
              }}>
                {homeData.summary || '데이터를 불러오는 중입니다...'}
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                flexShrink: 0, backgroundColor: 'rgba(137,128,255,0.2)', color: '#dee0ff',
                padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(137,128,255,0.3)',
                fontWeight: 600, cursor: isRefreshing ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
                transition: 'all 0.2s', backdropFilter: 'blur(8px)',
                opacity: isRefreshing ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!isRefreshing) e.currentTarget.style.backgroundColor = 'rgba(137,128,255,0.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(137,128,255,0.2)'; }}
            >
              <span className="material-symbols-outlined" style={{
                fontSize: '16px',
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}>refresh</span>
              <span>{isRefreshing ? 'AI 재분석 중...' : 'AI 재분석'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ KPI + 리스크 그리드 ═══════ */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>

        {/* 수주 달성률 카드 */}
        <div style={{
          backgroundColor: '#ffffff', padding: '28px', borderRadius: '14px',
          boxShadow: '0 2px 12px rgba(3,14,68,0.05)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(3,14,68,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(3,14,68,0.05)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#030e44', fontFamily: 'Manrope, sans-serif' }}>
              수주 달성률
            </h3>
            <span style={{ fontSize: '10px', color: '#515b92', backgroundColor: '#dee0ff',
              padding: '3px 10px', borderRadius: '9999px', fontWeight: 700, letterSpacing: '0.5px',
            }}>KPI</span>
          </div>
          <DonutChart value={Math.round(orderRate)} label="수주" color="#030e44" delay={200} />
          <div style={{
            display: 'flex', justifyContent: 'space-around', width: '100%',
            borderTop: '1px solid rgba(198,197,209,0.2)', paddingTop: '14px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#767680', fontWeight: 600, letterSpacing: '0.5px' }}>TARGET</p>
              <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#030e44', fontSize: '14px' }}>{kpi.order_target || '-'}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#767680', fontWeight: 600, letterSpacing: '0.5px' }}>ACTUAL</p>
              <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#515b92', fontSize: '14px' }}>{kpi.order_actual || '-'}</p>
            </div>
          </div>
        </div>

        {/* 매출 달성률 카드 */}
        <div style={{
          backgroundColor: '#ffffff', padding: '28px', borderRadius: '14px',
          boxShadow: '0 2px 12px rgba(3,14,68,0.05)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(3,14,68,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(3,14,68,0.05)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#030e44', fontFamily: 'Manrope, sans-serif' }}>
              매출 달성률
            </h3>
            <span style={{ fontSize: '10px', color: '#515b92', backgroundColor: '#dee0ff',
              padding: '3px 10px', borderRadius: '9999px', fontWeight: 700, letterSpacing: '0.5px',
            }}>KPI</span>
          </div>
          <DonutChart value={Math.round(salesRate)} label="매출" color="#848dc8" delay={400} />
          <div style={{
            display: 'flex', justifyContent: 'space-around', width: '100%',
            borderTop: '1px solid rgba(198,197,209,0.2)', paddingTop: '14px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#767680', fontWeight: 600, letterSpacing: '0.5px' }}>TARGET</p>
              <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#030e44', fontSize: '14px' }}>{kpi.sales_target || '-'}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#767680', fontWeight: 600, letterSpacing: '0.5px' }}>ACTUAL</p>
              <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#848dc8', fontSize: '14px' }}>{kpi.sales_actual || '-'}</p>
            </div>
          </div>
        </div>

        {/* 리스크 현황 카드 */}
        <div style={{
          background: 'linear-gradient(145deg, #1b2559, #030e44)',
          padding: '28px', borderRadius: '14px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(3,14,68,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#dee0ff', fontFamily: 'Manrope, sans-serif' }}>
                리스크 현황
              </h3>
              <span className="material-symbols-outlined" style={{ color: '#8980ff', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                shield
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(222,224,255,0.5)' }}>AI 분석 기반 위험 등급</p>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: '4px', marginBottom: '4px',
          }}>
            <span style={{ fontSize: '42px', fontWeight: 800, color: '#dee0ff', fontFamily: 'Manrope, sans-serif' }}>
              <CountUp end={totalRisk} />
            </span>
            <span style={{ fontSize: '14px', color: 'rgba(222,224,255,0.6)', fontWeight: 500 }}>건</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'High', value: riskCount.high, bg: '#ffdad6', textColor: '#93000a', icon: '🔴' },
              { label: 'Medium', value: riskCount.medium, bg: '#d0dcfe', textColor: '#3b4762', icon: '🟡' },
              { label: 'Low', value: riskCount.low, bg: '#e8eaf0', textColor: '#45464f', icon: '🟢' },
            ].map((r) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(222,224,255,0.7)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px' }}>{r.icon}</span>
                  {r.label}
                </span>
                <span style={{
                  backgroundColor: r.bg, color: r.textColor,
                  padding: '3px 14px', borderRadius: '9999px', fontWeight: 700, fontSize: '13px',
                  minWidth: '50px', textAlign: 'center',
                }}>
                  <CountUp end={r.value} suffix="건" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 핵심 이슈 트래커 ═══════ */}
      <section style={{
        backgroundColor: '#ffffff', padding: '28px 32px', borderRadius: '14px',
        boxShadow: '0 2px 12px rgba(3,14,68,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#515b92', fontSize: '22px' }}>
              assignment
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#030e44', fontFamily: 'Manrope, sans-serif' }}>
                핵심 이슈 트래커
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#767680' }}>
                AI가 선별한 이번 주 주요 이슈 및 액션 아이템
              </p>
            </div>
          </div>
          <span style={{
            fontSize: '12px', backgroundColor: '#dee0ff', color: '#515b92',
            padding: '5px 14px', borderRadius: '8px', fontWeight: 700,
          }}>
            총 {homeData.key_issues?.length || 0}건
          </span>
        </div>

        {(!homeData.key_issues || homeData.key_issues.length === 0) ? (
          <div style={{
            textAlign: 'center', color: '#767680', padding: '40px',
            backgroundColor: '#f7f9ff', borderRadius: '12px',
            border: '1px dashed rgba(198,197,209,0.4)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', display: 'block', marginBottom: '12px', color: '#c6c5d1' }}>
              check_circle
            </span>
            <p style={{ margin: 0, fontWeight: 600 }}>현재 보고된 이슈가 없습니다</p>
            <p style={{ margin: '8px 0 0', fontSize: '13px' }}>AI가 데이터를 분석 중이거나, 특이사항이 없는 상태입니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {homeData.key_issues.map((issue, i) => {
              const cfg = URGENCY_CONFIG[issue.urgency] || URGENCY_CONFIG.low;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderRadius: '12px', backgroundColor: '#f7f9ff',
                    borderLeft: `4px solid ${cfg.border}`,
                    transition: 'all 0.2s ease',
                    cursor: 'default',
                    animation: `fadeSlideIn 0.4s ease ${i * 0.1}s both`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 4px 16px ${cfg.glow}`;
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                    <span className="material-symbols-outlined" style={{
                      color: cfg.border, flexShrink: 0, marginTop: '2px', fontSize: '20px',
                      fontVariationSettings: "'FILL' 1",
                    }}>{cfg.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{
                        margin: 0, fontWeight: 700, color: '#030e44', fontSize: '14px',
                        fontFamily: 'Manrope, sans-serif',
                      }}>{issue.title}</h4>
                      <p style={{
                        margin: '4px 0 0', fontSize: '13px', color: '#45464f',
                        lineHeight: 1.5,
                      }}>{issue.description}</p>
                      <div style={{
                        margin: '8px 0 0', fontSize: '12px', color: '#515b92',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                        <span style={{ fontWeight: 600 }}>{issue.action}</span>
                      </div>
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0, marginLeft: '16px',
                    background: cfg.bg, color: cfg.color,
                    padding: '5px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.3px',
                  }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════ CSS 애니메이션 ═══════ */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

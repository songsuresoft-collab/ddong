'use client';

export default function LoadingSkeleton() {
  return (
    <main style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* AI 브리핑 skeleton */}
      <section
        style={{
          borderRadius: '12px',
          height: '200px',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(198,197,209,0.2)',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }} className="shimmer" style={{ opacity: 0.3 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <div className="shimmer" style={{ height: '24px', width: '120px', borderRadius: '9999px', backgroundColor: '#1e008f' }} />
          <span className="material-symbols-outlined" style={{ color: '#c5c0ff', fontSize: '18px' }}>auto_awesome</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
          <div className="shimmer" style={{ height: '28px', width: '60%', borderRadius: '8px' }} />
          <div className="shimmer" style={{ height: '28px', width: '40%', borderRadius: '8px' }} />
        </div>
      </section>

      {/* KPI Cards skeleton */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 4px rgba(3,14,68,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              height: '240px',
            }}
          >
            <div
              className="shimmer"
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '12px solid #ebeef5',
                backgroundColor: 'transparent',
              }}
            />
            <div className="shimmer" style={{ height: '20px', width: '120px', borderRadius: '4px' }} />
          </div>
        ))}
      </section>

      {/* Issues list skeleton */}
      <section
        style={{
          backgroundColor: '#f1f4fb',
          padding: '32px',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div className="shimmer" style={{ height: '24px', width: '160px', borderRadius: '4px' }} />
          <div className="shimmer" style={{ height: '16px', width: '80px', borderRadius: '4px', opacity: 0.6 }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#ffffff',
              padding: '16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
              <div className="shimmer" style={{ width: '8px', height: '40px', borderRadius: '9999px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div className="shimmer" style={{ height: '16px', width: '50%', borderRadius: '4px' }} />
                <div className="shimmer" style={{ height: '12px', width: '30%', borderRadius: '4px', opacity: 0.6 }} />
              </div>
            </div>
            <div className="shimmer" style={{ height: '28px', width: '80px', borderRadius: '9999px' }} />
          </div>
        ))}
      </section>

      {/* AI 분석 중 메시지 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: '#767680',
          fontSize: '14px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px', animation: 'spin 2s linear infinite' }}>
          autorenew
        </span>
        AI가 최신 데이터를 분석 중입니다... (20~40초 소요)
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

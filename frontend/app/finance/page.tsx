'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity, Database, Cpu, TrendingUp, DollarSign, ShieldAlert, AlertCircle, Zap } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Legend, Filler, BarController, LineController, DoughnutController } from 'chart.js';
import { Doughnut, Chart } from 'react-chartjs-2';
import styles from './finance-dashboard.module.css';

ChartJS.register(ArcElement, Tooltip, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Legend, Filler, BarController, LineController, DoughnutController);

// ── 월별 데이터 (원본 동일) ───────────────────────────────────────────────
const MON_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const ACT_DATA: Record<string,(number|null)[]> = {
  SS1:[2.20,2.03,null,null,null,null,null,null,null,null,null,null],
  SS2:[0.86,1.31,null,null,null,null,null,null,null,null,null,null],
  SS3:[1.49,1.44,null,null,null,null,null,null,null,null,null,null],
  SS4:[0.07,0.14,null,null,null,null,null,null,null,null,null,null],
};
const EXP_DATA: Record<string,number[]> = {
  SS1:[1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40],
  SS2:[1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88],
  SS3:[1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72],
  SS4:[0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84],
};
const TC: Record<string,any> = {
  SS1:{solid:'#00FFFF',fillAct:'rgba(0,255,255,0.60)',fillExp:'rgba(0,255,255,0.18)',borderExp:'rgba(0,255,255,0.5)'},
  SS2:{solid:'#3fb950',fillAct:'rgba(63,185,80,0.60)',fillExp:'rgba(63,185,80,0.18)',borderExp:'rgba(63,185,80,0.5)'},
  SS3:{solid:'#DC143C',fillAct:'rgba(220,20,60,0.55)',fillExp:'rgba(220,20,60,0.18)',borderExp:'rgba(220,20,60,0.5)'},
  SS4:{solid:'#FFBF00',fillAct:'rgba(255,191,0,0.60)',fillExp:'rgba(255,191,0,0.18)',borderExp:'rgba(255,191,0,0.5)'},
};
const TEAMS = ['SS1','SS2','SS3','SS4'] as const;

// ── 성장 트렌드 데이터 ─────────────────────────────────────────────────────
const CONTRACTS = [
  {year:2023,amount:'41.13억',mm:220,headcount:29,projects:9,service:41.13,toolCost:0,ownTool:0,porting:0,tools:{MATLAB:0,STATIC:0,MI:0,MV:0,CV:0,CT:0,FIT:0}},
  {year:2024,amount:'43.18억',mm:261,headcount:32,projects:11,service:39.74,toolCost:0,ownTool:3.29,porting:0.15,tools:{MATLAB:20,STATIC:3,MI:8,MV:15,CV:11,CT:5,FIT:0}},
  {year:2025,amount:'87.51억',mm:496,headcount:34,projects:11,service:67.96,toolCost:8.33,ownTool:10.35,porting:0.87,tools:{MATLAB:43,STATIC:7,MI:5,MV:27,CV:26,CT:16,FIT:0}},
  {year:2026,amount:'60.90억',mm:357.5,headcount:37,projects:6,service:49.89,toolCost:5.86,ownTool:5.56,porting:0,tools:{MATLAB:30,STATIC:3,MI:4,MV:20,CV:19,CT:8,FIT:2}},
];
const REV_DETAIL = [
  {year:2023,total:45.93,service:42.54,toolCost:0,ownTool:3.40,government:0,distribute:0},
  {year:2024,total:48.95,service:40.40,toolCost:0,ownTool:3.44,government:0.60,distribute:0},
  {year:2025,total:73.47,service:56.96,toolCost:8.33,ownTool:9.11,government:0.87,distribute:-1.80},
  {year:2026,total:70.08,service:0,toolCost:0,ownTool:0,government:0,distribute:0},
];
const PER_CAP_ORDER   = [1.85,1.69,2.57,1.65];
const PER_CAP_REVENUE = [1.58,1.53,2.16,1.89];

// ── 프로젝트 데이터 ──────────────────────────────────────────────────────────
const PROJECTS = [
  {id:1, code:'Q2 CY2026',       name:'VPCS1.1 Base 양산 확대 검증',                 status:2, pm:'홍수범', team:'SS2', workers:[], mm:18, contractAmt:'2.97억', startDate:'2026-06-01',endDate:'2027-12-31'},
  {id:2, code:'(발급 예정)',       name:'HCU 제어로직 SW 검증(26년) - 모델 검증',      status:6, pm:'정고성', team:'SS1', workers:['정고성','권영동','주해원','김재강','황지원','조재혁','이혜윤'], mm:78, contractAmt:'12.89억', startDate:'2026-03-03',endDate:'2027-02-28'},
  {id:3, code:'(발급 예정)',       name:'HCU 제어로직 SW 검증(26년) - 코드 검증',      status:6, pm:'정고성', team:'SS1', workers:['김선우'], mm:12, contractAmt:'2.06억', startDate:'2026-03-03',endDate:'2027-02-28'},
  {id:4, code:'(발급 예정)',       name:'VCU SW 검증(26년) - VPC1.1 모델정적',          status:6, pm:'시종진', team:'SS1', workers:['이미솔'], mm:12, contractAmt:'1.91억', startDate:'2026-03-03',endDate:'2027-02-28'},
  {id:5, code:'(발급 예정)',       name:'VCU SW 검증(26년) - VPC1.1 모델동적',          status:6, pm:'송현지', team:'SS4', workers:['김연희','김지환','변다솔'], mm:60, contractAmt:'10.05억', startDate:'2026-03-03',endDate:'2027-02-28'},
  {id:6, code:'(발급 예정)',       name:'VCU SW 검증(26년) - VPC1.1 기능안전',          status:6, pm:'김양수', team:'SS3', workers:['유효정','박혜민'], mm:48, contractAmt:'8.99억', startDate:'2026-03-03',endDate:'2027-02-28'},
  {id:7, code:'(발급 예정)',       name:'VCU SW 검증(26년) - 앱디자인 유지보수',        status:6, pm:'이민현', team:'SS2', workers:['김민석'], mm:24, contractAmt:'3.72억', startDate:'2026-03-03',endDate:'2027-02-28'},
  {id:8, code:'(발급 예정)',       name:'VCU SW 검증(26년) - VPC1.2 모델정적',          status:6, pm:'시종진', team:'SS2', workers:['이명준'], mm:18, contractAmt:'2.99억', startDate:'2026-03-03',endDate:'2027-02-28'},
  {id:9, code:'서비스_2603_04',   name:'SCU 제어기 모델 단위 검증',                    status:6, pm:'송현지', team:'SS4', workers:['김동환'], mm:4.5, contractAmt:'0.75억', startDate:'2026-03-03',endDate:'2026-07-17'},
  {id:10,code:'서비스_2507_12',   name:'자율주행 협조제어 - 기능안전 Part6',           status:6, pm:'김양수', team:'SS3', workers:['김두희','박가은'], mm:30, contractAmt:'6.23억', startDate:'2025-07-01',endDate:'2027-03-31'},
  {id:11,code:'서비스_2503_07',   name:'25년 VCU SW 검증 - 기능안전 Part6',            status:7, pm:'김양수', team:'SS3', workers:['김양수','권용균','유효정'], mm:72, contractAmt:'14.11억', startDate:'2025-03-03',endDate:'2026-02-28'},
  {id:12,code:'서비스_2503_06',   name:'25년 VCU SW 검증 - 정기 펌웨어',               status:7, pm:'홍수범', team:'SS2', workers:['홍수범','시종진','이민현'], mm:96, contractAmt:'16.08억', startDate:'2025-03-03',endDate:'2026-02-28'},
  {id:13,code:'서비스_2501_11',   name:'25년 HCU 제어로직 SW 검증',                    status:7, pm:'정고성', team:'SS1', workers:['장은서','김서진'], mm:194, contractAmt:'32.08억', startDate:'2025-01-01',endDate:'2026-12-31'},
  {id:14,code:'Q1 CY2026',       name:'표준화 기법 시스템 아키텍처 작성',              status:8, pm:'정고성', team:'SS1', workers:[], mm:15, contractAmt:'2.10억', startDate:'2026-01-30',endDate:'2026-06-19'},
  {id:15,code:'Q1 CY2026',       name:'VPC-S 1.2 HEV 파생 B04 차종 SW검증',           status:8, pm:'정고성', team:'SS1', workers:[], mm:72, contractAmt:'12.33억', startDate:'2026-01-01',endDate:'2026-12-31'},
];

const BADGE_MAP: Record<number,{label:string,cls:string}> = {
  2:{label:'미시작',   cls:styles.ledGray},
  6:{label:'진행중',   cls:styles.ledCyan},
  7:{label:'정상종료', cls:styles.ledAmber},
  8:{label:'DROPPED',  cls:styles.ledCrimson},
};

// ── 누적 계산 ─────────────────────────────────────────────────────────────
const makeCumAct = (arr: (number|null)[]) => { let c=0; return arr.map(v=>{ if(v==null)return null; c+=v; return Math.round(c*100)/100; }); };
const makeCumExp = (arr: number[])        => { let c=0; return arr.map(v=>{ c+=v; return Math.round(c*100)/100; }); };

// ── 차트 옵션 공통 ────────────────────────────────────────────────────────
const areaOpts = (waveTeam: string): any => ({
  responsive:true, maintainAspectRatio:false,
  interaction:{mode:'index',intersect:false},
  animation:{duration:700,easing:'easeInOutQuart'},
  plugins:{
    legend:{labels:{color:'#8A8D98',font:{size:10},boxWidth:14,padding:8}},
    tooltip:{backgroundColor:'#111',titleColor:'#fff',bodyColor:'#E0E2EB',borderColor:'#333',borderWidth:1,
      callbacks:{label:(ctx:any)=>`${ctx.dataset.label}: ${ctx.parsed.y!=null?ctx.parsed.y.toFixed(2):'-'}억`}}
  },
  scales:{
    y:{stacked:false,min:0,max:2.5,grid:{color:'rgba(255,255,255,0.06)'},
      ticks:{color:'#8A8D98',font:{size:10},callback:(v:any)=>`${v}억`,stepSize:0.5},
      title:{display:true,text:'월별(억)',color:'#666',font:{size:9}}},
    y2:{position:'right',min:0,...(waveTeam!=='Total'?{max:25}:{}),
      grid:{drawOnChartArea:false},
      ticks:{color:'rgba(255,215,0,0.6)',font:{size:9},callback:(v:any)=>`${v}억`,...(waveTeam!=='Total'?{stepSize:5}:{})},
      title:{display:true,text:'누적(억)',color:'rgba(255,215,0,0.5)',font:{size:9}}},
    x:{grid:{display:false},ticks:{color:'#8A8D98',font:{size:10}}}
  },
  datasets:{bar:{barPercentage:0.82,categoryPercentage:0.85}}
});

const trendOpts: any = {
  responsive:true, maintainAspectRatio:false,
  plugins:{
    legend:{labels:{color:'#8A8D98',font:{size:11}}},
    tooltip:{backgroundColor:'#111',bodyColor:'#E0E2EB',borderColor:'#333',borderWidth:1}
  },
  scales:{
    y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8A8D98',callback:(v:any)=>`${v}억`},suggestedMax:100},
    y2:{position:'right',grid:{drawOnChartArea:false},min:0,suggestedMax:600,ticks:{color:'#10B981',callback:(v:any)=>`${v}M`}},
    x:{grid:{display:false},ticks:{color:'#8A8D98'}}
  }
};


// ── Mock Data (원본 App.jsx 동일) ──────────────────────────────────────────
const MOCK = {
  h1: {
    order: { kpi: {
      Total: { target: 71.32, actual: 60.90, expected: 61.20, remaining: 10.42 },
      SS1:   { target: 26.10, actual: 14.95, expected: 14.95 },
      SS2:   { target: 16.76, actual: 19.39, expected: 19.68 },
      SS3:   { target: 20.36, actual: 15.77, expected: 15.77 },
      SS4:   { target: 8.11,  actual: 10.80, expected: 10.80 },
    }},
    revenue: { kpi: {
      Total: { target: 47.98, actual: 9.61,  expected: 35.35, remaining: 38.37 },
      SS1:   { target: 17.90, actual: 2.83,  expected: 10.64 },
      SS2:   { target: 12.34, actual: 2.59,  expected: 12.35 },
      SS3:   { target: 12.81, actual: 2.44,  expected: 12.35 },
      SS4:   { target: 4.33,  actual: 1.74,  expected: 5.72  },
    }},
  },
  annual: {
    order: { kpi: {
      Total: { target: 101.89, actual: 60.90, expected: 61.20, remaining: 40.99 },
      SS1:   { target: 37.28, actual: 14.95, expected: 14.95 },
      SS2:   { target: 23.94, actual: 19.39, expected: 19.68 },
      SS3:   { target: 29.08, actual: 15.77, expected: 15.77 },
      SS4:   { target: 11.60, actual: 10.80, expected: 10.80 },
    }},
    revenue: { kpi: {
      Total: { target: 88.17, actual: 29.69, expected: 70.08, remaining: 58.48 },
      SS1:   { target: 33.02, actual: 12.09, expected: 16.84 },
      SS2:   { target: 22.75, actual: 10.34, expected: 22.61 },
      SS3:   { target: 23.85, actual: 2.65,  expected: 20.60 },
      SS4:   { target: 8.56,  actual: 4.61,  expected: 10.03 },
    }},
  },
};

// ── MOCK 월별/트렌드/피드 (원본 동일, appData fallback용) ──────────────────────────────────
const MOCK_MONTHLY = {
  labels: MON_LABELS,
  actual: {
    SS1: [2.20,2.03,null,null,null,null,null,null,null,null,null,null] as (number|null)[],
    SS2: [0.86,1.31,null,null,null,null,null,null,null,null,null,null] as (number|null)[],
    SS3: [1.49,1.44,null,null,null,null,null,null,null,null,null,null] as (number|null)[],
    SS4: [0.07,0.14,null,null,null,null,null,null,null,null,null,null] as (number|null)[],
  },
  expected: {
    SS1: [1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40,1.40],
    SS2: [1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88,1.88],
    SS3: [1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72,1.72],
    SS4: [0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84,0.84],
  },
};
const MOCK_TREND = {
  labels: ['2023','2024','2025','2026(E)'],
  orderBar:    [41.13,43.18,87.51,63.22],
  revenueLine: [45.93,48.95,73.47,70.08],
};
const MOCK_FEED = [
  { type:'critical', title:'전 팀 매출 목표 달성 리스크', desc:'상반기 및 연간 매출 달성률이 전 팀 목 60% 미만. 추가 매출원 확보가 시급합니다.' },
  { type:'cyan',     title:'수주 실적 관리 제안', desc:'SS2와 SS4의 수주 달성률은 우수하나, SS1과 SS3은 Critical. 영업 파이프라인 재점검이 필요합니다.' },
];

// ── Count-up Hook (원본 동일) ────────────────────────────────────────────────
function useCountUp(end: number, duration = 900, key = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setCount(p === 1 ? end : ease * end);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, key]);
  return count;
}

// ── 도넛 헬퍼 ─────────────────────────────────────────────────────────────
const mkDonut = (pct: number, color: string) => ({
  labels: ['달성', '잔여'],
  datasets: [{ data: [Math.min(pct, 100), Math.max(0, 100 - pct)], backgroundColor: [color, 'rgba(255,255,255,0.06)'], borderWidth: 0 }],
});
const donutBase = { rotation: -90, circumference: 180, maintainAspectRatio: false, animation: { duration: 0 }, plugins: { legend: { display: false }, tooltip: { enabled: false } } };
const outerOpts = { ...donutBase, cutout: '72%' };
const innerOpts = { ...donutBase, cutout: '80%' };
const teamOuter = { ...donutBase, cutout: '70%' };
const teamInner = { ...donutBase, cutout: '80%' };

const rateColor = (r: number, isOrder = false) =>
  isOrder ? (r >= 80 ? '#34D399' : r >= 60 ? '#10B981' : '#DC143C')
           : (r >= 80 ? '#00FFFF' : r >= 60 ? '#FFBF00' : '#DC143C');

// ── KpiRow ─────────────────────────────────────────────────────────────────
function KpiRow({ label, Icon, accentColor, accentDim, actRate, expRate, actAnim, expAnim, data, isOrder }: any) {
  const actC = rateColor(actRate, isOrder);
  return (
    <div style={{ background: `rgba(${accentDim},0.04)`, border: `1px solid rgba(${accentDim},0.18)`, borderRadius: 13, padding: '0.45rem 0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.25rem' }}>
        <Icon size={14} color={accentColor} />
        <span style={{ fontSize: '0.85rem', color: accentColor, fontFamily: 'Jura,sans-serif', letterSpacing: '1.5px', fontWeight: 700 }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#c0c3cc', fontWeight: 700 }}>
          목표 <strong style={{ color: '#e0e2eb', fontSize: '0.95rem' }}>{data?.target || 0}</strong><span style={{ fontSize: '0.72rem', color: '#666' }}> 억</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.35rem' }}>
        <div style={{ position: 'relative', width: 105, height: 56, flexShrink: 0 }}>
          <Doughnut data={mkDonut(expAnim, accentColor + '44')} options={outerOpts} />
          <div style={{ position: 'absolute', inset: 0 }}>
            <Doughnut data={mkDonut(actAnim, actC)} options={innerOpts} />
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', lineHeight: 1 }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: 'Jura,sans-serif', color: actC, textShadow: `0 0 10px ${actC}99`, whiteSpace: 'nowrap' }}>{actAnim.toFixed(1)}%</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: '0.7rem', color: '#8A8D98', fontFamily: 'Jura,sans-serif', minWidth: 28 }}>실적</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'Jura,sans-serif', color: actC, lineHeight: 1 }}>{actAnim.toFixed(1)}%</span>
            <span style={{ fontSize: '0.72rem', color: actC, opacity: 0.75 }}>{data?.actual || 0}억</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: '0.7rem', color: '#8A8D98', fontFamily: 'Jura,sans-serif', minWidth: 28 }}>예상</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'Jura,sans-serif', color: accentColor, opacity: 0.72, lineHeight: 1 }}>{expAnim.toFixed(1)}%</span>
            <span style={{ fontSize: '0.72rem', color: '#7a7d8a' }}>{data?.expected || 0}억</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#8A8D98' }}>잔여 <strong style={{ color: '#DC143C', fontSize: '0.88rem' }}>{(Number(data?.remaining) || 0).toFixed(1)}억</strong></span>
      </div>
    </div>
  );
}

// ── DualGauge ──────────────────────────────────────────────────────────────
function DualGauge({ orderData, revenueData, periodKey = 0 }: any) {
  const oActR = (Number(orderData?.actual || 0) / Math.max(Number(orderData?.target || 1), 1)) * 100;
  const oExpR = (Number(orderData?.expected || 0) / Math.max(Number(orderData?.target || 1), 1)) * 100;
  const rActR = (Number(revenueData?.actual || 0) / Math.max(Number(revenueData?.target || 1), 1)) * 100;
  const rExpR = (Number(revenueData?.expected || 0) / Math.max(Number(revenueData?.target || 1), 1)) * 100;
  const oActA = useCountUp(oActR, 1200, periodKey);
  const oExpA = useCountUp(oExpR, 1200, periodKey);
  const rActA = useCountUp(rActR, 1200, periodKey);
  const rExpA = useCountUp(rExpR, 1200, periodKey);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
      <KpiRow label="수주 (ORDER)" Icon={TrendingUp} accentColor="#10B981" accentDim="16,185,129"
        actRate={oActR} expRate={oExpR} actAnim={oActA} expAnim={oExpA} data={orderData} isOrder />
      <KpiRow label="매출 (REVENUE)" Icon={DollarSign} accentColor="#FFBF00" accentDim="255,191,0"
        actRate={rActR} expRate={rExpR} actAnim={rActA} expAnim={rExpA} data={revenueData} />
    </div>
  );
}

// ── MiniGauge (TeamCard 내부) ──────────────────────────────────────────────
function MiniGauge({ label, Icon, acColor, actRate, expRate, actAnim, expAnim, actual, expected, target, remaining }: any) {
  const actC = rateColor(actRate, label === '수주');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon size={11} color={acColor} />
        <span style={{ fontSize: '0.75rem', color: acColor, fontFamily: 'Jura,sans-serif', letterSpacing: '1.2px', fontWeight: 800, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '38%' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Doughnut data={mkDonut(expAnim, acColor + '55')} options={teamOuter} />
        </div>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Doughnut data={mkDonut(actAnim, actC)} options={teamInner} />
        </div>
        <div style={{ position: 'absolute', bottom: '-8%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', lineHeight: 1 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 900, fontFamily: 'Jura,sans-serif', color: actC, whiteSpace: 'nowrap' }}>{actAnim.toFixed(1)}%</span>
        </div>
      </div>
      {[['목표', target, '#c0c3cc'], ['실적', actual, actC], ['예상', expected, acColor], ['잔여', remaining, '#F87171']].map(([k, v, c]) => (
        <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '1px 5px' }}>
          <span style={{ fontSize: '0.62rem', color: '#7a7d8a', fontFamily: 'Jura,sans-serif', fontWeight: 700 }}>{k}</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 900, fontFamily: 'Jura,sans-serif', color: String(c) }}>{Number(v || 0).toFixed(1)}<span style={{ fontSize: '0.55rem', opacity: 0.65 }}>억</span></span>
        </div>
      ))}
    </div>
  );
}

// ── TeamCard ───────────────────────────────────────────────────────────────
function TeamCard({ team, orderData, revenueData, animKey = 0 }: any) {
  const od = orderData   || { target: 0, actual: 0, expected: 0 };
  const rd = revenueData || { target: 0, actual: 0, expected: 0 };
  const oAR = od.target > 0 ? (od.actual   / od.target) * 100 : 0;
  const oER = od.target > 0 ? Math.min((od.expected / od.target) * 100, 100) : 0;
  const rAR = rd.target > 0 ? (rd.actual   / rd.target) * 100 : 0;
  const rER = rd.target > 0 ? Math.min((rd.expected / rd.target) * 100, 100) : 0;
  const oAA = useCountUp(oAR, 1200, animKey);
  const oEA = useCountUp(oER, 1200, animKey);
  const rAA = useCountUp(rAR, 1200, animKey);
  const rEA = useCountUp(rER, 1200, animKey);

  const calcStatus = (r: number) => r >= 80 ? 'normal' : r >= 60 ? 'warning' : 'critical';
  const worst = [calcStatus(oER), calcStatus(rER)].includes('critical') ? 'critical'
    : [calcStatus(oER), calcStatus(rER)].includes('warning') ? 'warning' : 'normal';
  const badgeClass: any = { normal: styles.ledCyan, warning: styles.ledAmber, critical: styles.ledCrimson };
  const odC = calcStatus(oER) === 'normal' ? '#00FFFF' : calcStatus(oER) === 'warning' ? '#FFBF00' : '#DC143C';
  const rdC = calcStatus(rER) === 'normal' ? '#FFBF00' : calcStatus(rER) === 'warning' ? '#FFBF00' : '#DC143C';

  return (
    <div className={styles.teamCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontWeight: 900, fontFamily: 'Jura,sans-serif', fontSize: '1.1rem', letterSpacing: '2.5px', color: '#e0e2eb' }}>{team}</span>
        <span className={`${styles.ledBadge} ${badgeClass[worst]}`} style={{ fontSize: '0.68rem' }}>{worst.toUpperCase()}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, paddingTop: '0.2rem' }}>
        <MiniGauge label="수주" Icon={TrendingUp} acColor={odC}
          actRate={oAR} expRate={oER} actAnim={oAA} expAnim={oEA}
          target={od.target} actual={od.actual} expected={od.expected} remaining={Math.max(0, od.target - od.actual)} />
        <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch', flexShrink: 0 }} />
        <MiniGauge label="매출" Icon={DollarSign} acColor={rdC}
          actRate={rAR} expRate={rER} actAnim={rAA} expAnim={rEA}
          target={rd.target} actual={rd.actual} expected={rd.expected} remaining={Math.max(0, rd.target - rd.actual)} />
      </div>
    </div>
  );
}

// ── 실시간 시계 헬퍼 ────────────────────────────────────────────────────────
const WEEK_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
function formatClock(d: Date) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  const ss   = String(d.getSeconds()).padStart(2, '0');
  const day  = WEEK_KO[d.getDay()];
  return { date: `${yyyy}.${mm}.${dd}`, day, hh, min, ss };
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [period, setPeriod] = useState<'h1' | 'annual'>('h1');
  const [periodKey, setPeriodKey] = useState(0);
  const [glitchClass, setGlitchClass] = useState('glitch1');
  const [activeTab, setActiveTab] = useState<'area'|'grid'|'trend'>('area');
  const [waveTeam, setWaveTeam] = useState<string>('Total');
  const [waveClass, setWaveClass] = useState('waveSwitch1');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle'|'ok'|'error'>('idle');
  // ▪ appData: MOCK으로 초기화, MCP 응답 수신 시 전체 실시간 교체 (원본 App.jsx appData 패턴)
  const [appData, setAppData] = useState<any>(MOCK);
  const [mcpInsight, setMcpInsight] = useState<string>('');
  const [fromCache, setFromCache] = useState<boolean>(false);

  // ── 실시간 시계 (SSR hydration 방지: 초기값 null, 클라이언트 마운트 후 시작) ──
  const [clock, setClock] = useState<ReturnType<typeof formatClock> | null>(null);
  useEffect(() => {
    setClock(formatClock(new Date()));
    const timer = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  // appData에서 period KPI 추출
  const periodData = appData?.[period] || MOCK[period];
  const orderKpi   = periodData?.order?.kpi   || MOCK[period].order.kpi;
  const revenueKpi = periodData?.revenue?.kpi || MOCK[period].revenue.kpi;

  const switchPeriod = (p: 'h1' | 'annual') => {
    if (p === period) return;
    setPeriod(p);
    setPeriodKey(k => k + 1);
    setGlitchClass(c => c === 'glitch1' ? 'glitch2' : 'glitch1');
  };

  const switchTab = (t: 'area'|'grid'|'trend') => { setActiveTab(t); setPeriodKey(k=>k+1); };
  const switchTeam = (t: string) => { if(waveTeam!==t){ setWaveTeam(t); setWaveClass(c=>c==='waveSwitch1'?'waveSwitch2':'waveSwitch1'); } };

  // appData로부터 월별 데이터 추출 — MCP 응답 수신 시 자동 반영 (원본 App.jsx 패턴)
  const mRev = appData?.monthlyRevenue || MOCK_MONTHLY;
  const dynACT: Record<string,(number|null)[]> = {
    SS1: mRev?.actual?.SS1 || mRev?.SS1 || ACT_DATA.SS1,
    SS2: mRev?.actual?.SS2 || mRev?.SS2 || ACT_DATA.SS2,
    SS3: mRev?.actual?.SS3 || mRev?.SS3 || ACT_DATA.SS3,
    SS4: mRev?.actual?.SS4 || mRev?.SS4 || ACT_DATA.SS4,
  };
  const dynEXP: Record<string,number[]> = {
    SS1: mRev?.expected?.SS1 || EXP_DATA.SS1,
    SS2: mRev?.expected?.SS2 || EXP_DATA.SS2,
    SS3: mRev?.expected?.SS3 || EXP_DATA.SS3,
    SS4: mRev?.expected?.SS4 || EXP_DATA.SS4,
  };
  const dynLabels: string[] = mRev?.labels || MON_LABELS;

  // trend/contracts/feed 데이터 (appData 우선, fallback MOCK)
  const CONTRACTS_DATA = appData?.contracts?.length > 0 ? appData.contracts : CONTRACTS;
  const FEED_DATA: any[] = appData?.feed?.length > 0 ? appData.feed : MOCK_FEED;

  // ── buildAreaDatasets ──
  const makeTeamBar = (t: string) => {
    const c = TC[t];
    return {
      type:'bar' as const, label:`${t} 실적`,
      data: dynLabels.map((_: string, i: number) => { const a=dynACT[t][i]; return (a!=null&&a!==undefined)?a:dynEXP[t][i]; }),
      backgroundColor: dynLabels.map((_: string, i: number) => { const a=dynACT[t][i]; return (a!=null)?c.fillAct:c.fillExp; }),
      borderColor:     dynLabels.map((_: string, i: number) => { const a=dynACT[t][i]; return (a!=null)?c.solid:c.borderExp; }),
      borderWidth:     dynLabels.map((_: string, i: number) => { const a=dynACT[t][i]; return (a!=null)?1.5:1; }),
      borderRadius:3, order:2,
    };
  };

  const cumExpTotal = makeCumExp(dynLabels.map((_: string,i: number)=>TEAMS.reduce((s,t)=>s+(dynEXP[t][i]||0),0)));
  const cumActTotal = makeCumAct(dynLabels.map((_: string,i: number)=>{ const vs=TEAMS.map(t=>dynACT[t][i]); if(vs.every((v: any)=>v==null))return null; return vs.reduce((s: number,v: any)=>s+(v||0),0) as number; }));

  const areaDatasets = waveTeam==='Total'
    ? [
        ...TEAMS.map(t=>makeTeamBar(t)),
        {type:'line' as const,label:'누적 예상',data:cumExpTotal,borderColor:'rgba(255,255,255,0.75)',borderWidth:2,borderDash:[5,4],pointRadius:3,pointBackgroundColor:'rgba(255,255,255,0.9)',fill:false,tension:0.35,spanGaps:true,order:1,yAxisID:'y2'},
        {type:'line' as const,label:'누적 실적',data:cumActTotal,borderColor:'#FFD700',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#FFD700',pointBorderColor:'#fff',pointBorderWidth:1,fill:false,tension:0.35,spanGaps:false,order:0,yAxisID:'y2'},
      ]
    : [
        makeTeamBar(waveTeam),
        {type:'line' as const,label:'누적 예상',data:makeCumExp(dynEXP[waveTeam]),borderColor:'rgba(255,255,255,0.75)',borderWidth:2,borderDash:[5,4],pointRadius:3,pointBackgroundColor:'rgba(255,255,255,0.9)',fill:false,tension:0.35,spanGaps:true,order:1,yAxisID:'y2'},
        {type:'line' as const,label:'누적 실적',data:makeCumAct(dynACT[waveTeam]),borderColor:'#FFD700',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#FFD700',pointBorderColor:'#fff',pointBorderWidth:1,fill:false,tension:0.35,spanGaps:false,order:0,yAxisID:'y2'},
      ];

  const areaData = {labels:dynLabels, datasets:areaDatasets};

  // trend데이터 — appData 또는 MOCK_TREND fallback
  const trendData = {
    labels: (appData?.trend?.labels || MOCK_TREND.labels),
    datasets:[
      {type:'bar' as const,label:'수주금액(억)',data:(appData?.trend?.orderBar || CONTRACTS.map((c:any)=>parseFloat(c.amount))),backgroundColor:'rgba(0,255,255,0.22)',borderColor:'#00FFFF',borderWidth:1.5,borderRadius:5,order:2},
      {type:'bar' as const,label:'매출금액(억)',data:(appData?.trend?.revenueLine || REV_DETAIL.map((r:any)=>r.total)),backgroundColor:'rgba(255,191,0,0.18)',borderColor:'#FFBF00',borderWidth:1.5,borderRadius:5,order:2},
      {type:'line' as const,label:'계약 M/M',data:CONTRACTS.map((c:any)=>c.mm),borderColor:'#10B981',borderWidth:2.5,pointRadius:6,pointBackgroundColor:'#10B981',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:0.3,yAxisID:'y2',order:0},
    ]
  };

  // ── MCP 초기 자동 로드 — 캐시 히트 시 빠름, MISS 시 MCP 질의
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/finance');
        if (!res.ok) return;
        const d = await res.json();
        if (d.success) {
          // 원본 App.jsx와 동일: sanitize 후 appData 전체 교체
          setAppData((prev: any) => ({ ...prev, ...d }));
          if (d.ai_insight) setMcpInsight(d.ai_insight);
          setFromCache(!!d._from_cache);
        }
      } catch {
        // 백엔드 미실행 시 정적 MOCK 유지
        console.log('[Finance] Backend offline — using static mock data');
      }
    };
    load();
  }, []);

  // ── handleSync (수동 새로고침, ?force=true) — 원본 App.jsx 방식 ──
  const handleSync = async () => {
    setIsSyncing(true); setSyncStatus('idle');
    try {
      const res = await fetch('http://localhost:8000/api/finance?force=true');
      const d = await res.json();
      if (d.success) {
        setSyncStatus('ok');
        setAppData((prev: any) => ({ ...prev, ...d }));
        if (d.ai_insight) setMcpInsight(d.ai_insight);
        setFromCache(!!d._from_cache);
      } else {
        setSyncStatus('error');
      }
    } catch { setSyncStatus('error'); }
    finally { setIsSyncing(false); }
  };

  return (
    <div className={styles.root}>
      <div className={styles.appContainer}>

        {/* ── LEFT PANEL ── */}
        <section className={`${styles.panelLeft} ${styles.glassPanel}`}>
          <h2 className={styles.sectionTitle}><Activity size={18} /> STATUS CORE</h2>

          <div className={styles.quantumToggle}>
            <button className={`${styles.qBtn} ${period === 'h1' ? styles.qBtnActive : ''}`} onClick={() => switchPeriod('h1')}>H1 상반기</button>
            <button className={`${styles.qBtn} ${period === 'annual' ? styles.qBtnActive : ''}`} onClick={() => switchPeriod('annual')}>Annual 연간</button>
          </div>

          <div className={styles.scrollInner}>
            <div className={styles[glitchClass as keyof typeof styles]}>
              {/* Dual Gauge */}
              <DualGauge orderData={orderKpi.Total} revenueData={revenueKpi.Total} periodKey={periodKey} />

              {/* Team Sensors 헤더 */}
              <h3 style={{ fontSize: '0.82rem', color: '#8A8D98', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '1.1rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.09)' }}>
                TEAM SENSORS
              </h3>

              {/* 팀 카드 2×2 */}
              <div className={styles.teamGrid}>
                {(['SS1', 'SS2', 'SS3', 'SS4'] as const).map(t => (
                  <TeamCard key={t} team={t} orderData={orderKpi[t]} revenueData={revenueKpi[t]} animKey={periodKey} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CENTER PANEL ── */}
        <section className={`${styles.panelCenter} ${styles.glassPanel}`}>
          <div className={styles.centerHeader}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0, marginRight: '0.8rem', flexShrink: 0 }}>
              <Database size={18} /> DEEP DIVE MATRIX
            </h2>

            {/* ── 실시간 시계 ── */}
            <div className={styles.clockWidget} style={{ margin: '0 auto' }}>
              {clock ? (
                <>
                  <span className={styles.clockDate}>{clock.date}</span>
                  <span className={styles.clockDay}>{clock.day}</span>
                  <span className={styles.clockTime}>
                    <span className={styles.clockDigit}>{clock.hh}</span>
                    <span className={styles.clockColon}>:</span>
                    <span className={styles.clockDigit}>{clock.min}</span>
                    <span className={styles.clockColon}>:</span>
                    <span className={styles.clockDigit}>{clock.ss}</span>
                  </span>
                </>
              ) : (
                <span className={styles.clockTime} style={{ opacity: 0.3 }}>--<span className={styles.clockColon}>:</span>--<span className={styles.clockColon}>:</span>--</span>
              )}
            </div>

            <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'0.8rem',flexShrink:0}}>
              {syncStatus==='ok'    && <span style={{fontSize:'0.68rem',color:'#00FFFF',whiteSpace:'nowrap'}}>✓ 동기화 완료</span>}
              {syncStatus==='error' && <span style={{fontSize:'0.68rem',color:'#DC143C',whiteSpace:'nowrap'}}>✗ 오류</span>}
              <button className={styles.syncBtn} onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? 'AI 재분석 중...' : 'AI 재분석'}
              </button>
            </div>
          </div>

          <div className={styles.centerTabs}>
            <button className={`${styles.tabBtn} ${activeTab==='area'  ? styles.tabBtnActive : ''}`} onClick={()=>switchTab('area')}>매출 추이 (Waves)</button>
            <button className={`${styles.tabBtn} ${activeTab==='grid'  ? styles.tabBtnActive : ''}`} onClick={()=>switchTab('grid')}>프로젝트 그리드</button>
            <button className={`${styles.tabBtn} ${activeTab==='trend' ? styles.tabBtnActive : ''}`} onClick={()=>switchTab('trend')}>성장 트렌드</button>
          </div>

          <div className={styles.contentArea}>

            {/* ── 매출 추이 탭 ── */}
            {activeTab==='area' && (
              <div className={styles.fadeIn} style={{height:'100%',display:'flex',flexDirection:'column'}}>
                {/* 팀 선택 버튼 */}
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,padding:'6px 8px',background:'rgba(255,255,255,0.03)',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
                  <span style={{fontSize:'0.65rem',color:'#888',fontFamily:'Jura,sans-serif',letterSpacing:'2px',textTransform:'uppercase',marginRight:2,whiteSpace:'nowrap',fontWeight:600}}>TEAM ▶</span>
                  {['Total','SS1','SS2','SS3','SS4'].map(t=>{
                    const pal = ({
                      Total:{on:'#ffffff',glow:'rgba(255,255,255,0.6)',bg:'rgba(255,255,255,0.15)'},
                      SS1:{on:'#00FFFF',glow:'rgba(0,255,255,0.5)',bg:'rgba(0,255,255,0.18)'},
                      SS2:{on:'#4ade80',glow:'rgba(74,222,128,0.5)',bg:'rgba(74,222,128,0.18)'},
                      SS3:{on:'#ff4d6d',glow:'rgba(255,77,109,0.5)',bg:'rgba(255,77,109,0.18)'},
                      SS4:{on:'#fbbf24',glow:'rgba(251,191,36,0.5)',bg:'rgba(251,191,36,0.18)'},
                    } as Record<string,any>)[t] || {on:'#999',glow:'transparent',bg:'transparent'};

                    const active = waveTeam===t;
                    return (
                      <button key={t} onClick={()=>switchTeam(t)} style={{
                        fontFamily:'Jura,sans-serif',fontWeight:active?800:600,fontSize:'0.82rem',
                        padding:'5px 16px',borderRadius:6,cursor:'pointer',letterSpacing:active?'2px':'1px',
                        transition:'all 0.2s ease',
                        background:active?pal.bg:'transparent',
                        border:`1.5px solid ${active?pal.on:'rgba(255,255,255,0.18)'}`,
                        color:active?pal.on:'#7a7d8a',
                        boxShadow:active?`0 0 18px ${pal.glow},inset 0 0 10px ${pal.bg}`:'none',
                        textShadow:active?`0 0 12px ${pal.on}`:'none',
                        transform:active?'translateY(-1px) scale(1.04)':'scale(1)',
                        minWidth:46,
                      }}>{t}</button>
                    );
                  })}
                  <span style={{marginLeft:'auto',fontSize:'0.65rem',fontFamily:'Jura,sans-serif',
                    color:waveTeam==='Total'?'#aaa':({SS1:'#00FFFF',SS2:'#4ade80',SS3:'#ff4d6d',SS4:'#fbbf24'} as any)[waveTeam],
                    letterSpacing:'1.5px',whiteSpace:'nowrap',fontWeight:600}}>
                    {waveTeam==='Total'?'ALL TEAMS':`${waveTeam} UNIT`}
                  </span>
                </div>
                {/* 차트 */}
                <div style={{flex:1,position:'relative'}} className={styles[waveClass as keyof typeof styles]}>
                  <Chart type='bar' data={areaData} options={areaOpts(waveTeam)} />
                </div>
              </div>
            )}

            {/* ── 프로젝트 그리드 탭 ── */}
            {activeTab==='grid' && (
              <div className={`${styles.fadeIn}`} style={{height:'100%',overflowY:'auto'}}>
                <table className={styles.dataTable}>
                  <thead><tr>
                    <th style={{width:90}}>코드</th>
                    <th>프로젝트명</th>
                    <th style={{width:68}}>상태</th>
                    <th style={{width:42}}>팀</th>
                    <th style={{width:52}}>PM</th>
                    <th style={{width:110}}>진행률</th>
                  </tr></thead>
                  <tbody>
                    {PROJECTS.map((p,idx)=>{
                      const today=new Date('2026-03-26');
                      let pct=0;
                      if(p.startDate&&p.endDate){
                        const s=new Date(p.startDate),e=new Date(p.endDate);
                        const total=e.getTime()-s.getTime();
                        const elapsed=Math.min(today.getTime()-s.getTime(),total);
                        pct=total>0?Math.max(0,Math.min((elapsed/total)*100,100)):0;
                      }
                      const barC=p.status===8?'#DC143C':pct>=80?'#00FFFF':pct>=50?'#FFBF00':'#DC143C';
                      const teamC:any={SS1:'#00FFFF',SS2:'#3fb950',SS3:'#DC143C',SS4:'#FFBF00'};
                      const b=BADGE_MAP[p.status]||{label:'?',cls:styles.ledGray};
                      return (
                        <tr key={p.id} style={{verticalAlign:'top'}}>
                          <td style={{color:'#00FFFF',fontFamily:'Jura,sans-serif',fontSize:'0.72rem',paddingTop:8,whiteSpace:'nowrap'}}>{p.code}</td>
                          <td style={{color:p.status===8?'#DC143C':p.status===7?'#8A8D98':'#e0e2eb',fontWeight:600,fontSize:'0.8rem',lineHeight:'1.35'}}>{p.name}</td>
                          <td style={{paddingTop:8}}><span className={`${styles.ledBadge} ${b.cls}`} style={{fontSize:'0.68rem'}}>{b.label}</span></td>
                          <td style={{paddingTop:6,textAlign:'center'}}>
                            <span style={{display:'inline-block',padding:'2px 7px',borderRadius:6,fontSize:'0.72rem',fontWeight:800,fontFamily:'Jura,sans-serif',
                              background:`${teamC[p.team]||'#888'}22`,color:teamC[p.team]||'#888',border:`1px solid ${teamC[p.team]||'#888'}55`}}>{p.team}</span>
                          </td>
                          <td style={{color:'#8A8D98',fontSize:'0.78rem',paddingTop:8,whiteSpace:'nowrap'}}>{p.pm}</td>
                          <td style={{minWidth:100,paddingTop:8}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{flex:1,height:5,background:'rgba(255,255,255,0.08)',borderRadius:3,overflow:'hidden'}}>
                                <div style={{width:`${pct}%`,height:'100%',background:barC,borderRadius:3,transition:'width 1s ease'}}/>
                              </div>
                              <span style={{fontSize:'0.75rem',color:'#8A8D98',minWidth:42,textAlign:'right'}}>{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── 성장 트렌드 탭 ── */}
            {activeTab==='trend' && (
              <div className={styles.fadeIn} style={{height:'100%',display:'flex',flexDirection:'column',gap:'0.6rem',overflow:'hidden'}}>
                <div style={{flex:'0 0 42%',minHeight:0}}>
                  <Chart type='bar' data={trendData} options={trendOpts} />
                </div>
                <div style={{flex:1,overflowY:'auto'}}>
                  <div style={{fontSize:'0.75rem',color:'#00FFFF',marginBottom:'0.5rem',fontFamily:'Jura,sans-serif',fontWeight:700}}>📋 연도별 수주 성장 상세</div>
                  <table className={styles.dataTable} style={{fontSize:'0.69rem'}}>
                    <thead><tr>
                      <th>연도</th><th>PJT</th><th style={{textAlign:'right'}}>M/M</th>
                      <th style={{textAlign:'right'}}>수주액↵(억)</th><th style={{textAlign:'right'}}>서비스</th>
                      <th style={{textAlign:'right'}}>MATLAB</th><th style={{textAlign:'right'}}>STATIC</th>
                    </tr></thead>
                    <tbody>
                      {[...CONTRACTS].reverse().map((c,i)=>(
                        <tr key={i}>
                          <td style={{color:'#00FFFF',fontFamily:'Jura,sans-serif',fontWeight:800}}>{c.year===2026?'2026(E)':c.year}</td>
                          <td style={{textAlign:'center',color:'#e0e2eb',fontWeight:700}}>{c.projects}</td>
                          <td style={{textAlign:'right',color:'#10B981'}}>{c.mm}</td>
                          <td style={{textAlign:'right',color:'#e0e2eb',fontWeight:700}}>{parseFloat(c.amount).toFixed(2)}</td>
                          <td style={{textAlign:'right',color:'#e0e2eb'}}>{c.service.toFixed(1)}</td>
                          <td style={{textAlign:'center',color:'#00FFFF'}}>{c.tools.MATLAB}</td>
                          <td style={{textAlign:'center',color:'#3fb950'}}>{c.tools.STATIC}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* ── RIGHT PANEL ── */}
        <section className={`${styles.panelRight} ${styles.glassPanel}`}>
          <h2 className={styles.sectionTitle} style={{ fontSize: '1.05rem', color: '#fff' }}>
            <Cpu size={17} color="#00FFFF" /> A.I PRECOGNITION
          </h2>

          {/* ── TIMELINE ── */}
          <div style={{ flex: '0 0 auto', overflowY: 'auto', paddingRight: '0.3rem' }}>
            <div className={styles.timeline}>

              {/* area 탭 — appData 우선, fallback MOCK */}
              {activeTab === 'area' && (() => {
                const rd = (appData?.annual?.revenue?.kpi || MOCK.annual.revenue.kpi) as any;
                const ss3Rate = ((rd.SS3?.actual / rd.SS3?.target)*100 || 0).toFixed(1);
                const totRate = ((rd.Total?.actual / rd.Total?.target)*100 || 0).toFixed(1);
                const ss1Rate = ((rd.SS1?.actual / rd.SS1?.target)*100 || 0).toFixed(1);
                return [
                  { type:'critical', title:'전 팀 매출 목표 달성 리스크',
                    desc:`연간 매출 달성률 ${totRate}% — 상반기 실적 기준 전 팀 모두 60% 미만으로 Critical 상태. 추가 매출원 확보가 시급합니다.` },
                  { type:'critical', title:`SS3 매출 심각 (${ss3Rate}%)`,
                    desc:`SS3 실적 ${rd.SS3?.actual}억으로 목표 ${rd.SS3?.target}억 대비 가장 낮은 달성률. 조기 매출인식 방안 검토 필요.` },
                  { type:'amber', title:'SS1 수익성 집중 관리',
                    desc:`SS1 매출 달성률 ${ss1Rate}%. 하반기 매출 집중 구조로 H1 수치 부진. 마일스톤 조기 이행 권고.` },
                ];
              })()!.map((item, idx) => (
                <div className={styles.timelineItem} key={idx}>
                  <div className={`${styles.timelineDot} ${item.type==='critical'?styles.dotCrimson:item.type==='amber'?styles.dotAmber:styles.dotCyan}`}/>
                  <div className={styles.timelineContent}>
                    <h4 style={{color:item.type==='critical'?'#DC143C':item.type==='amber'?'#FFBF00':'#00FFFF'}}>
                      {item.type==='critical'&&<ShieldAlert size={12} style={{marginRight:4,verticalAlign:'text-bottom'}}/>}
                      {item.type==='amber'&&<AlertCircle size={12} style={{marginRight:4,verticalAlign:'text-bottom'}}/>}
                      {item.type==='cyan'&&<Zap size={12} style={{marginRight:4,verticalAlign:'text-bottom'}}/>}
                      {item.title}
                    </h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}

              {/* grid 탭 — appData.projects 우선, fallback MOCK */}
              {activeTab === 'grid' && (() => {
                const projs: any[] = appData?.projects?.length > 0 ? appData.projects : PROJECTS;
                const actv = projs.filter((p: any)=>p.status===6).length;
                const drpd = projs.filter((p: any)=>p.status===8).length;
                const done = projs.filter((p: any)=>p.status===7).length;
                const drpdAmt = projs.filter((p: any)=>p.status===8).reduce((s: number,p: any)=>s+parseFloat((String(p.contractAmt)||'0').replace(/[^0-9.]/g,'')),0).toFixed(2);
                return [
                  { type:'amber', title:`진행 중 ${actv}건 / DROPPED ${drpd}건`,
                    desc:`전체 ${projs.length}개 프로젝트 중 진행 중 ${actv}건, 정상종료 ${done}건, DROPPED ${drpd}건. 손실액 약 ${drpdAmt}억.` },
                  { type:'critical', title:'DROPPED 프로젝트 리스크',
                    desc:`Q1 CY2026 프로젝트 2건 DROPPED. 동일 고객사(현대케피코) 후속 수주 파이프라인 즉시 점검 필요.` },
                  { type:'amber', title:'팀별 리소스 편중 리스크',
                    desc:`SS1(HCU 검증)에 리소스 집중 편중. SS3 소수 프로젝트로 매출 기여 제한. 균형잡힌 수주 분배 전략 권고.` },
                ];
              })()!.map((item, idx) => (
                <div className={styles.timelineItem} key={idx}>
                  <div className={`${styles.timelineDot} ${item.type==='critical'?styles.dotCrimson:item.type==='amber'?styles.dotAmber:styles.dotCyan}`}/>
                  <div className={styles.timelineContent}>
                    <h4 style={{color:item.type==='critical'?'#DC143C':item.type==='amber'?'#FFBF00':'#00FFFF'}}>
                      {item.type==='critical'&&<ShieldAlert size={12} style={{marginRight:4,verticalAlign:'text-bottom'}}/>}
                      {item.type==='amber'&&<AlertCircle size={12} style={{marginRight:4,verticalAlign:'text-bottom'}}/>}
                      {item.title}
                    </h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}

              {/* trend 탭 */}
              {activeTab === 'trend' && [
                { type:'amber', title:'2026(E) 수주 감소 추세',
                  desc:`2025년 87.51억 대비 2026년 63.22억(E)으로 약 27.8% 감소 전망. 구조적 둔화.` },
                { type:'critical', title:'인당 수주 하락 리스크',
                  desc:`인당 수주: 2025년 2.57억 → 2026년 1.65억(δ35.8%). 인원 증가 대비 수주 감소로 생산성 지표 악화.` },
                { type:'cyan', title:'매출 성장 지속성 기회',
                  desc:`인당 매출 2023→2025 지속 성장(1.58→2.16억). 2026년 예상 1.89억은 안정적 수준.` },
              ].map((item, idx) => (
                <div className={styles.timelineItem} key={idx}>
                  <div className={`${styles.timelineDot} ${item.type==='critical'?styles.dotCrimson:item.type==='amber'?styles.dotAmber:styles.dotCyan}`}/>
                  <div className={styles.timelineContent}>
                    <h4 style={{color:item.type==='critical'?'#DC143C':item.type==='amber'?'#FFBF00':'#00FFFF'}}>
                      {item.type==='critical'&&<ShieldAlert size={12} style={{marginRight:4,verticalAlign:'text-bottom'}}/>}
                      {item.type==='amber'&&<AlertCircle size={12} style={{marginRight:4,verticalAlign:'text-bottom'}}/>}
                      {item.type==='cyan'&&<Zap size={12} style={{marginRight:4,verticalAlign:'text-bottom'}}/>}
                      {item.title}
                    </h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* ── SUMMARY TABLE ── */}
          <div className={styles.summaryArea}>

            {/* area tab — 매출 현황 요약 */}
            {activeTab === 'area' && (() => {
              const rd = (appData?.annual?.revenue?.kpi || MOCK.annual.revenue.kpi) as any;
              return (
                <>
                  <h3 style={{fontSize:'0.72rem',color:'#FFBF00',marginBottom:'0.35rem',letterSpacing:'1px',textTransform:'uppercase',display:'flex',alignItems:'center',gap:4}}>
                    <DollarSign size={11}/> 매출 현황 요약
                  </h3>
                  <table className={styles.dataTable} style={{fontSize:'0.62rem',background:'rgba(0,0,0,0.25)',borderRadius:6}}>
                    <thead><tr>
                      <th style={{padding:'3px 4px'}}>팀</th>
                      <th style={{padding:'3px 4px',textAlign:'right'}}>목표</th>
                      <th style={{padding:'3px 4px',textAlign:'right'}}>실적</th>
                      <th style={{padding:'3px 4px',textAlign:'right'}}>예상</th>
                      <th style={{padding:'3px 4px',textAlign:'right'}}>달성률</th>
                    </tr></thead>
                    <tbody>
                      {(['Total','SS1','SS2','SS3','SS4'] as const).map(t => {
                        const r = rd[t];
                        const rate = (r.actual / r.target * 100).toFixed(1);
                        const col = Number(rate) >= 50 ? '#3fb950' : Number(rate) >= 30 ? '#FFBF00' : '#DC143C';
                        return (
                          <tr key={t}>
                            <td style={{color:'#00FFFF',fontFamily:'Jura,sans-serif',fontWeight:t==='Total'?700:400,padding:'2px 4px'}}>{t}</td>
                            <td style={{textAlign:'right',padding:'2px 4px'}}>{r.target}</td>
                            <td style={{textAlign:'right',color:'#FFBF00',fontWeight:700,padding:'2px 4px'}}>{r.actual}</td>
                            <td style={{textAlign:'right',color:'#8A8D98',padding:'2px 4px'}}>{r.expected}</td>
                            <td style={{textAlign:'right',color:col,fontWeight:700,padding:'2px 4px'}}>{rate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              );
            })()}

            {/* grid tab — 프로젝트 현황 요약 */}
            {activeTab === 'grid' && (() => {
              const today = new Date('2026-03-28');
              const MS_DAY = 86400000;
              const projs2: any[] = appData?.projects?.length > 0 ? appData.projects : PROJECTS;
              const withPct = projs2.filter((p: any)=>p.status===6&&p.startDate&&p.endDate).map((p: any)=>{
                const s=new Date(p.startDate),e=new Date(p.endDate);
                const pct=Math.min(100,Math.max(0,((today.getTime()-s.getTime())/(e.getTime()-s.getTime()))*100));
                return {...p,pct};
              });
              const aboutToEnd = withPct.filter((p: any)=>{ const d=(new Date(p.endDate).getTime()-today.getTime())/MS_DAY; return d>=0&&d<=60; });
              const midProgress = withPct.filter((p: any)=>p.pct>=45&&p.pct<=55);
              const badgeCts = [
                {label:'진행중',count:projs2.filter((p: any)=>p.status===6).length,color:'#00FFFF',bg:'rgba(0,255,255,0.07)',border:'rgba(0,255,255,0.22)'},
                {label:'정상종료',count:projs2.filter((p: any)=>p.status===7).length,color:'#8A8D98',bg:'rgba(255,255,255,0.04)',border:'rgba(255,255,255,0.10)'},
                {label:'DROPPED',count:projs2.filter((p: any)=>p.status===8).length,color:'#DC143C',bg:'rgba(220,20,60,0.07)',border:'rgba(220,20,60,0.22)'},
              ];
              return (
                <>
                  <h3 style={{fontSize:'0.7rem',color:'#00FFFF',marginTop:0,marginBottom:'0.35rem',letterSpacing:'1px',textTransform:'uppercase',display:'flex',alignItems:'center',gap:4}}>
                    프로젝트 현황 요약
                  </h3>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:'0.55rem'}}>
                    {badgeCts.map(s=>(
                      <div key={s.label} style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:7,padding:'5px 4px',textAlign:'center'}}>
                        <div style={{fontSize:'1.25rem',fontWeight:900,fontFamily:'Jura,sans-serif',color:s.color,lineHeight:1}}>{s.count}</div>
                        <div style={{fontSize:'0.57rem',color:'#666',marginTop:2,letterSpacing:'0.5px'}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:'0.61rem',color:'#555',letterSpacing:'0.5px',marginBottom:'0.22rem',fontFamily:'Jura,sans-serif'}}>▸ 주요 과제 동향</div>
                  <table className={styles.dataTable} style={{fontSize:'0.60rem',background:'rgba(0,0,0,0.18)',borderRadius:6,tableLayout:'fixed'}}>
                    <colgroup><col style={{width:52}}/><col style={{width:'auto'}}/><col style={{width:34}}/><col style={{width:38}}/></colgroup>
                    <thead><tr>
                      <th style={{padding:'3px 3px',textAlign:'left'}}>구분</th>
                      <th style={{padding:'3px 3px',textAlign:'left'}}>과제명</th>
                      <th style={{padding:'3px 3px',textAlign:'center'}}>팀</th>
                      <th style={{padding:'3px 3px',textAlign:'right'}}>진행</th>
                    </tr></thead>
                    <tbody>
                      {aboutToEnd.length===0&&midProgress.length===0&&(
                        <tr><td colSpan={4} style={{textAlign:'center',color:'#555',padding:'6px'}}>해당 과제 없음</td></tr>
                      )}
                      {aboutToEnd.map(p=>{
                        const dL=Math.ceil((new Date(p.endDate!).getTime()-today.getTime())/MS_DAY);
                        const teamC:any={SS1:'#00FFFF',SS2:'#3fb950',SS3:'#DC143C',SS4:'#FFBF00'};
                        return (
                          <tr key={`e${p.id}`}>
                            <td style={{padding:'2px 3px'}}><span style={{display:'inline-block',padding:'1px 5px',borderRadius:3,fontSize:'0.56rem',fontWeight:700,color:'#fbbf24',background:'rgba(251,191,36,0.12)',border:'1px solid rgba(251,191,36,0.4)'}}>종료예정</span></td>
                            <td style={{padding:'2px 3px',fontSize:'0.6rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#ccc'}} title={p.name}>{p.name}</td>
                            <td style={{textAlign:'center',padding:'2px 3px'}}><span style={{padding:'0 4px',borderRadius:3,fontSize:'0.56rem',fontWeight:700,color:teamC[p.team]}}>{p.team}</span></td>
                            <td style={{textAlign:'right',padding:'2px 3px',fontSize:'0.58rem',color:'#888',fontFamily:'Jura,sans-serif'}}>D-{dL}</td>
                          </tr>
                        );
                      })}
                      {midProgress.map(p=>{
                        const teamC:any={SS1:'#00FFFF',SS2:'#3fb950',SS3:'#DC143C',SS4:'#FFBF00'};
                        return (
                          <tr key={`m${p.id}`}>
                            <td style={{padding:'2px 3px'}}><span style={{display:'inline-block',padding:'1px 5px',borderRadius:3,fontSize:'0.56rem',fontWeight:700,color:'#00FFFF',background:'rgba(0,255,255,0.12)',border:'1px solid rgba(0,255,255,0.4)'}}>50%근접</span></td>
                            <td style={{padding:'2px 3px',fontSize:'0.6rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#ccc'}} title={p.name}>{p.name}</td>
                            <td style={{textAlign:'center',padding:'2px 3px'}}><span style={{padding:'0 4px',borderRadius:3,fontSize:'0.56rem',fontWeight:700,color:teamC[p.team]}}>{p.team}</span></td>
                            <td style={{textAlign:'right',padding:'2px 3px',fontSize:'0.58rem',color:'#888',fontFamily:'Jura,sans-serif'}}>{p.pct.toFixed(0)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              );
            })()}

            {/* trend tab — 연도별 인당 수주/매출 */}
            {activeTab === 'trend' && (
              <>
                <h3 style={{fontSize:'0.82rem',color:'#00FFFF',marginTop:'0.4rem',marginBottom:'0.6rem',letterSpacing:'1px',textTransform:'uppercase',display:'flex',alignItems:'center',gap:6}}>
                  <TrendingUp size={12} style={{verticalAlign:'text-bottom'}}/> 연도별 인당 수주/매출
                </h3>
                <table className={styles.dataTable} style={{background:'rgba(0,0,0,0.3)',borderRadius:8,fontSize:'0.65rem'}}>
                  <thead><tr>
                    <th style={{padding:'4px 6px'}}>연도</th>
                    <th style={{padding:'4px 6px'}}>인원</th>
                    <th style={{padding:'4px 6px'}}>인당수주</th>
                    <th style={{padding:'4px 6px'}}>인당매출</th>
                  </tr></thead>
                  <tbody>
                    {[...CONTRACTS].reverse().map((c,i) => {
                      const oi = CONTRACTS.length - 1 - i;
                      return (
                        <tr key={i}>
                          <td style={{color:'#00FFFF',fontFamily:'Jura,sans-serif',fontWeight:800,padding:'4px 6px'}}>{c.year===2026?'2026(E)':c.year}</td>
                          <td style={{textAlign:'center',color:'#FFBF00',fontWeight:700,padding:'4px 6px'}}>{c.headcount}명</td>
                          <td style={{textAlign:'right',color:'#00FFFF',fontWeight:700,padding:'4px 6px'}}>{PER_CAP_ORDER[oi]?.toFixed(2)??'-'}억</td>
                          <td style={{textAlign:'right',color:'#FFBF00',fontWeight:700,padding:'4px 6px'}}>{PER_CAP_REVENUE[oi]?.toFixed(2)??'-'}억</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

          </div>
        </section>

      </div>
    </div>
  );
}

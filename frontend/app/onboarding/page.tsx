'use client';

import React, { useState } from 'react';
import styles from './onboarding.module.css';
import { GuideTab, ChecklistTab, GrowthTab } from './components/OnboardingTabs';

export default function Onboarding() {
  const [activeTab, setActiveTab] = useState<'guide' | 'checklist' | 'growth'>('guide');

  return (
    <main className={styles.container}>
      {/* Header Section */}
      <section className={styles.headerCard}>
        <h1>Onboarding & Growth</h1>
        <p>SURE-Intelligence Hub 사용을 위한 핵심 지침서와 개인 성장을 위한 가이드를 제공합니다.</p>
        <div style={{ position: 'absolute', top: '-10px', right: '-20px', fontSize: '180px', opacity: 0.1, color: '#fff', pointerEvents: 'none' }} className="material-symbols-outlined">
          rocket_launch
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className={styles.tabsContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'guide' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('guide')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>smart_toy</span>
          Onboarding Guide
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'checklist' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>checklist</span>
          My Progress
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'growth' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('growth')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>monitoring</span>
          Self Growth
        </button>
      </nav>

      {/* Tab Content Areas */}
      <section className={styles.contentArea}>
        {activeTab === 'guide' && <GuideTab />}
        {activeTab === 'checklist' && <ChecklistTab />}
        {activeTab === 'growth' && <GrowthTab />}
      </section>
    </main>
  );
}

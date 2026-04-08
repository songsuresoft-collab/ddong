'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { to: '/sdv-solution/code-static', label: 'Sessions', icon: '📋' },
    { to: '/sdv-solution/code-static/upload', label: 'Upload', icon: '📤' },
];

const analysisItems = [
    { to: '/sdv-solution/code-static/overview', label: 'Overview', icon: '📊' },
    { to: '/sdv-solution/code-static/compare', label: 'Compare', icon: '🔀' },
    { to: '/sdv-solution/code-static/hotspot', label: 'Hotspot', icon: '🔥' },
    { to: '/sdv-solution/code-static/trends', label: 'Trends', icon: '📈' },
];

const workItems = [
    { to: '/sdv-solution/code-static/workboard', label: 'Work Board', icon: '✅' },
];

const helpItems = [
    { to: '/sdv-solution/code-static/guide', label: 'User Guide', icon: '📖' },
];

const Sidebar: React.FC = () => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const isActive = (to: string) => {
        if (to === '/sdv-solution/code-static') return pathname === '/sdv-solution/code-static';
        return pathname === to || pathname.startsWith(to + '/');
    };

    return (
        <>
            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">FW</div>
                        <div>
                            <div className="sidebar-logo-text">FW Dashboard</div>
                            <div className="sidebar-logo-sub">Static Code Analysis</div>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-title">Management</div>
                    {navItems.map(item => (
                        <Link
                            key={item.to}
                            href={item.to}
                            className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}

                    <div className="nav-section-title" style={{ marginTop: 12 }}>Analysis</div>
                    {analysisItems.map(item => (
                        <Link
                            key={item.to}
                            href={item.to}
                            className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}

                    <div className="nav-section-title" style={{ marginTop: 12 }}>Work</div>
                    {workItems.map(item => (
                        <Link
                            key={item.to}
                            href={item.to}
                            className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}

                    <div className="nav-section-title" style={{ marginTop: 12 }}>Help</div>
                    {helpItems.map(item => (
                        <Link
                            key={item.to}
                            href={item.to}
                            className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="nav-section-title">Reference File</div>
                    <Link
                        href="/sdv-solution/code-static/reference"
                        className={`nav-item ${isActive('/sdv-solution/code-static/reference') ? 'active' : ''}`}
                    >
                        <span className="nav-item-icon">📑</span>
                        Upload Reference
                    </Link>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Mobile Toggle FAB */}
            <button
                className="sidebar-toggle-btn"
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={isOpen ? '사이드바 닫기' : '사이드바 열기'}
            >
                {isOpen ? '✕' : '☰'}
            </button>
        </>
    );
};

export default Sidebar;

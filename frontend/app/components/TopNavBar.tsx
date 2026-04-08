'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './TopNavBar.module.css';

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Financials', href: '/finance', icon: 'payments' },
  { label: 'Weekly Progress', href: '/weekly-progress', icon: 'timeline' },
  { label: 'Meeting Minutes', href: '/minutes', icon: 'description' },
  { label: 'Projects & Risks', href: '/projects', icon: 'assignment_late' },
  { label: 'Resources & HR', href: '/resources', icon: 'group' },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: 'menu_book' },
  { label: 'Onboarding', href: '/onboarding', icon: 'flight_takeoff' },
  { 
    label: 'SDV솔루션 업무 앱', 
    icon: 'apps', 
    subItems: [
      { label: '모델정적', href: '/sdv-solution/model-static' },
      { label: '코드정적', href: '/sdv-solution/code-static' },
      { label: '단위검증', href: '/sdv-solution/unit-test' }
    ]
  }
];

export default function TopNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExpandedMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMobileExpanded(null);
    setExpandedMenu(null);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.container} ref={menuRef}>
        {/* Left: Logo + Nav */}
        <div className={styles.leftSection}>
          <span className={styles.logo}>SURE-Intelligence Hub</span>

          {/* Hamburger for mobile */}
          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className={styles.desktopNav}>
            {NAV_ITEMS.map((item) => {
              const hasSub = !!item.subItems;
              const isActive = item.href
                ? pathname === item.href
                : (hasSub && item.subItems!.some(sub => sub.href !== '#' && pathname.startsWith(sub.href)));
              const isExpanded = expandedMenu === item.label;

              return (
                <div key={item.label} className={styles.subMenuWrapper}>
                  <button
                    className={`${styles.navButton} ${isActive ? styles.navButtonActive : ''}`}
                    onClick={() => {
                      if (hasSub) {
                        setExpandedMenu(isExpanded ? null : item.label);
                      } else if (item.href) {
                        setExpandedMenu(null);
                        router.push(item.href);
                      }
                    }}
                  >
                    <span className={`material-symbols-outlined ${styles.navIcon}`}>
                      {item.icon}
                    </span>
                    {item.label}
                    {hasSub && (
                      <span className={`material-symbols-outlined ${styles.navArrow}`}>
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    )}
                  </button>

                  {/* Sub-menu Dropdown */}
                  {hasSub && isExpanded && (
                    <div className={styles.subMenu}>
                      {item.subItems!.map(sub => {
                        const subActive = pathname === sub.href;
                        const disabled = sub.href === '#';
                        return (
                          <button
                            key={sub.label}
                            className={`${styles.subMenuItem} ${subActive ? styles.subMenuItemActive : ''} ${disabled ? styles.subMenuItemDisabled : ''}`}
                            onClick={() => {
                              setExpandedMenu(null);
                              if (!disabled) router.push(sub.href);
                            }}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Right: Search + Notifications + Profile */}
        <div className={styles.rightSection}>
          <div className={styles.searchWrapper}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input
              type="text"
              placeholder="Search insights..."
              className={styles.searchInput}
            />
          </div>

          <button className={styles.notifButton} aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>

          <div className={styles.avatar}>SDV</div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <>
          <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
          <div className={styles.mobileMenu}>
            {NAV_ITEMS.map((item) => {
              const hasSub = !!item.subItems;
              const isActive = item.href
                ? pathname === item.href
                : (hasSub && item.subItems!.some(sub => sub.href !== '#' && pathname.startsWith(sub.href)));
              const isMobileExpanded = mobileExpanded === item.label;

              return (
                <div key={item.label}>
                  <button
                    className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
                    onClick={() => {
                      if (hasSub) {
                        setMobileExpanded(isMobileExpanded ? null : item.label);
                      } else if (item.href) {
                        setMobileOpen(false);
                        router.push(item.href);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {item.icon}
                    </span>
                    {item.label}
                    {hasSub && (
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', marginLeft: 'auto' }}>
                        {isMobileExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    )}
                  </button>

                  {/* Mobile sub-items */}
                  {hasSub && isMobileExpanded && (
                    <>
                      {item.subItems!.map(sub => {
                        const subActive = pathname === sub.href;
                        const disabled = sub.href === '#';
                        return (
                          <button
                            key={sub.label}
                            className={`${styles.mobileSubItem} ${subActive ? styles.mobileSubItemActive : ''}`}
                            onClick={() => {
                              if (!disabled) {
                                setMobileOpen(false);
                                router.push(sub.href);
                              }
                            }}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                      <div className={styles.mobileDivider} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </header>
  );
}

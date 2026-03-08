import type { ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { to: '/', label: '📄 Pages', exact: true },
  { to: '/tags', label: '🏷️ Tags' },
  { to: '/devices', label: '📱 Devices' },
  { to: '/insights', label: '📊 Insights' },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🖨️</span>
          <span className={styles.brandName}>KM Kraft</span>
          <span className={styles.brandSub}>Admin</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, exact }) => {
            const fullPath = to === '/' ? '/admin' : `/admin${to}`;
          const active = exact
              ? location.pathname === fullPath || location.pathname === '/admin/'
              : location.pathname.startsWith(fullPath);
            return (
              <Link
                key={to}
                to={to}
                className={`${styles.navItem} ${active ? styles.active : ''}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <a href="/" className={styles.legacyLink}>← Old dashboard</a>
        </div>
      </aside>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

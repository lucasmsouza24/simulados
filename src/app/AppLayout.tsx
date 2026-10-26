import { Outlet } from 'react-router';
import { useI18n } from '../i18n/useI18n';
import { SiteFooter } from './Chrome';
import styles from './layout.module.css';

export function AppLayout() {
  const { t } = useI18n();
  return (
    <div className={styles.app}>
      <a className="skip-link" href="#main">
        {t.skipToContent}
      </a>
      <div className={styles.content}>
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}

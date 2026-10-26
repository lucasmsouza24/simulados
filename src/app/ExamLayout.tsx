import { NavLink, Outlet, useLoaderData } from 'react-router';
import type { examLoader } from '../data/api';
import type { Catalog } from '../domain/catalog';
import { formatClock } from '../domain/text';
import { BankProgressProvider } from '../features/bank/BankProgressProvider';
import { ExamSessionProvider } from '../features/exam/ExamSessionProvider';
import { useExamSession } from '../features/exam/sessionContext';
import { useI18n } from '../i18n/useI18n';
import { CatalogContext } from './catalog';
import { SiteHeader } from './Chrome';
import styles from './layout.module.css';

const WARN_AT_MINUTES = [10, 5, 1];

export function ExamLayout() {
  const catalog = useLoaderData<typeof examLoader>();
  return (
    <CatalogContext value={catalog}>
      <ExamSessionProvider catalog={catalog}>
        <BankProgressProvider>
          <ExamHeader catalog={catalog} />
          <Outlet />
        </BankProgressProvider>
      </ExamSessionProvider>
    </CatalogContext>
  );
}

function ExamHeader({ catalog }: { catalog: Catalog }) {
  const { t } = useI18n();
  const { locked } = useExamSession();
  const home = `/${catalog.exam.id}`;
  const linkClass = styles.navLink;

  return (
    <SiteHeader home={home} subtitle={catalog.exam.code}>
      <nav className={styles.nav} aria-label={t.nav.label}>
        <NavLink to={home} end className={linkClass}>
          {t.nav.exam}
        </NavLink>
        {!locked && (
          <NavLink to={`${home}/questoes`} className={linkClass}>
            {t.nav.bank}
          </NavLink>
        )}
      </nav>
      <Timer />
    </SiteHeader>
  );
}

function Timer() {
  const { t } = useI18n();
  const { session, now } = useExamSession();
  if (session?.status !== 'running') return null;

  const left = Math.max(0, session.endsAt - now);
  const minutesLeft = Math.ceil(left / 60_000);
  const warning = WARN_AT_MINUTES.includes(minutesLeft) ? t.exam.timeWarning(minutesLeft) : '';

  return (
    <>
      <span className={styles.timer} data-low={left < 5 * 60_000} role="timer" aria-label={t.exam.timeLeft}>
        {formatClock(left)}
      </span>
      <span className="visually-hidden" aria-live="polite">
        {warning}
      </span>
    </>
  );
}

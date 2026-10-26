import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { DEFAULT_EXAM } from '../data/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/useI18n';
import { Message, SiteHeader } from './Chrome';
import styles from './layout.module.css';

export function NotFoundPage() {
  const { t } = useI18n();
  useDocumentTitle(`${t.errors.notFoundTitle} · ${t.appName}`);
  return (
    <>
      <SiteHeader home={`/${DEFAULT_EXAM}`} />
      <Message title={t.errors.notFoundTitle} text={t.errors.notFoundText} action={<Link to={`/${DEFAULT_EXAM}`}>{t.errors.backHome}</Link>} />
    </>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  const { t } = useI18n();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  useDocumentTitle(`${notFound ? t.errors.notFoundTitle : t.errors.genericTitle} · ${t.appName}`);

  return (
    <>
      <SiteHeader home={`/${DEFAULT_EXAM}`} />
      <Message
        title={notFound ? t.errors.notFoundTitle : t.errors.genericTitle}
        text={notFound ? t.errors.examNotFound : t.errors.genericText}
        action={<Link to={`/${DEFAULT_EXAM}`}>{t.errors.backHome}</Link>}
      />
    </>
  );
}

export function LoadingPage() {
  const { t } = useI18n();
  return (
    <p role="status" className={styles.loading}>
      {t.loading}
    </p>
  );
}

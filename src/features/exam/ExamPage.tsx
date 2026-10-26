import { useCatalog } from '../../app/catalog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useI18n } from '../../i18n/useI18n';
import { ExamResults } from './ExamResults';
import { ExamRunner } from './ExamRunner';
import { ExamSetup } from './ExamSetup';
import { useExamSession } from './sessionContext';

export function ExamPage() {
  const { exam } = useCatalog();
  const { t } = useI18n();
  const { session } = useExamSession();
  useDocumentTitle(`${session?.status === 'done' ? t.results.title : t.exam.title} · ${exam.code} · ${t.appName}`);

  return (
    <main id="main" tabIndex={-1}>
      {session?.status === 'running' ? (
        <ExamRunner session={session} />
      ) : session?.status === 'done' ? (
        <ExamResults session={session} />
      ) : (
        <ExamSetup />
      )}
    </main>
  );
}

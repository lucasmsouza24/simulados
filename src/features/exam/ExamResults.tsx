import { useId, useState } from 'react';
import { useCatalog } from '../../app/catalog';
import { Explanation, Verdict } from '../../components/question/Explanation';
import { QuestionBody } from '../../components/question/QuestionBody';
import { QuestionMeta } from '../../components/question/QuestionMeta';
import { Button, ToggleChip } from '../../components/ui/Button';
import { Badge, Card, Notice } from '../../components/ui/Card';
import { ERROR_TYPES, HISTORY_COLUMNS, RESULT_COLUMNS, historyRows, resultRows, type ResultExtras } from '../../domain/export';
import { scoreExam, type QuestionResult } from '../../domain/scoring';
import { formatClock, localStamp } from '../../domain/text';
import { useI18n } from '../../i18n/useI18n';
import { toCsv } from '../../lib/csv';
import { copyText, downloadText } from '../../lib/download';
import type { ExamSession } from './session';
import { useExamSession } from './sessionContext';
import styles from './exam.module.css';

type Filter = 'all' | 'ok' | 'bad';

export function ExamResults({ session }: { session: ExamSession }) {
  const catalog = useCatalog();
  const { t, l } = useI18n();
  const { discard } = useExamSession();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const questions = session.questionIds.flatMap((id) => catalog.byId.get(id) ?? []);
  const score = scoreExam(catalog, questions, (id) => session.answers[id]?.response);
  const extras = (id: string): ResultExtras => ({
    confidence: session.answers[id]?.confidence,
    errorType: session.answers[id]?.errorType,
  });
  const finishedAt = session.finishedAt ?? session.endsAt;
  const withErrors = score.results.filter((r) => r.status !== 'ok');
  const classified = withErrors.filter((r) => session.answers[r.question.id]?.errorType).length;

  const visible = score.results.filter((r) => filter === 'all' || (filter === 'ok' ? r.status === 'ok' : r.status !== 'ok'));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const percent = (score.ratio * 100).toFixed(1).replace(/\.0$/, '');
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: t.results.filter.all, count: score.results.length },
    { id: 'ok', label: t.results.filter.ok, count: score.counts.ok },
    { id: 'bad', label: t.results.filter.bad, count: withErrors.length },
  ];

  return (
    <div className={styles.page}>
      <h1>{t.results.title}</h1>
      {session.timeUp && <Notice>{t.results.timeUp}</Notice>}

      <Card>
        <div className={styles.hero}>
          <div className={styles.big}>{percent}%</div>
          <div className={styles.big}>
            {score.scaled}
            <small> / {catalog.exam.scoreScale}</small>
          </div>
          <span className={styles.verdict} data-passed={score.passed}>
            {score.passed ? t.results.passed : t.results.failed}
          </span>
        </div>
        <ul className={styles.stats}>
          <li>
            <strong>{score.counts.ok}</strong> {t.results.ok}
          </li>
          <li>
            <strong>{score.counts.partial}</strong> {t.results.partial}
          </li>
          <li>
            <strong>{score.counts.bad}</strong> {t.results.bad}
          </li>
          <li>
            <strong>{score.counts.blank}</strong> {t.results.blank}
          </li>
          <li>
            <strong>{formatClock(finishedAt - session.startedAt)}</strong> {t.results.timeUsed}
          </li>
        </ul>
        <p className={styles.note}>{t.results.scoreNote(catalog.exam.passScore, catalog.exam.scoreScale)}</p>

        <h2 className={styles.sectionTitle}>{t.results.byDomain}</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t.results.domain}</th>
              <th scope="col" className={styles.num}>
                {t.results.questions}
              </th>
              <th scope="col" className={styles.num}>
                {t.results.points}
              </th>
              <th scope="col" className={styles.num}>
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {score.byDomain.map((d) => {
              const domain = catalog.exam.domains.find((x) => x.id === d.domainId);
              return (
                <tr key={d.domainId}>
                  <td>{domain ? l(domain.name) : d.domainId}</td>
                  <td className={styles.num}>
                    {d.questions} ({Math.round((d.questions / score.results.length) * 100)}%)
                  </td>
                  <td className={styles.num}>{Number(d.points.toFixed(2))}</td>
                  <td className={styles.num}>{Math.round((d.points / d.questions) * 100)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <ExportPanel
          examId={catalog.exam.id}
          finishedAt={finishedAt}
          results={score.results}
          extras={extras}
          errors={withErrors.length}
          classified={classified}
        />

        <div className={styles.actions}>
          <Button variant="ghost" onClick={discard}>
            {t.results.newExam}
          </Button>
        </div>
      </Card>

      <h2 className={styles.sectionTitle}>{t.results.review}</h2>
      <div className={styles.filters} role="group" aria-label={t.results.review}>
        {filters.map((f) => (
          <ToggleChip key={f.id} pressed={filter === f.id} onToggle={() => setFilter(f.id)}>
            {f.label} ({f.count})
          </ToggleChip>
        ))}
      </div>
      <ul className={styles.reviewList}>
        {visible.map((r) => (
          <ReviewItem key={r.question.id} result={r} session={session} open={open.has(r.question.id)} onToggle={() => toggle(r.question.id)} />
        ))}
      </ul>
    </div>
  );
}

function ReviewItem({ result, session, open, onToggle }: { result: QuestionResult; session: ExamSession; open: boolean; onToggle: () => void }) {
  const catalog = useCatalog();
  const { t, l } = useI18n();
  const { setErrorType } = useExamSession();
  const detailId = useId();
  const { question, status } = result;
  const errorType = session.answers[question.id]?.errorType;
  const requirement = catalog.requirements.get(question.requirement)?.requirement;
  const badge = status === 'partial' ? `${t.results.badge.partial} ${Math.round(result.grade.score * 100)}%` : t.results.badge[status];
  const tone = status === 'blank' ? 'neutral' : status;

  return (
    <li>
      <button type="button" className={styles.reviewRow} aria-expanded={open} aria-controls={detailId} onClick={onToggle}>
        <span className={styles.reviewNumber}>{result.index + 1}</span>
        <span className={styles.reviewText}>
          {l(question.stem)}
          <small>
            {question.id} · {t.formats[question.format]}
            {requirement && ` · ${l(requirement.name)}`}
          </small>
        </span>
        <Badge tone={tone}>
          {badge}
          {errorType && ` · ${t.results.errorTypes[errorType][0]}`}
        </Badge>
      </button>
      <div id={detailId} hidden={!open}>
        {open && (
          <Card className={styles.reviewDetail}>
            <QuestionMeta question={question} catalog={catalog} />
            <QuestionBody question={question} response={result.response} reveal />
            <Verdict question={question} response={result.response} graded />
            {status !== 'ok' && (
              <fieldset className={styles.errorPicker}>
                <legend>{t.results.errorType}</legend>
                <div>
                  {ERROR_TYPES.map((type) => {
                    const [label, hint] = t.results.errorTypes[type];
                    return (
                      <ToggleChip
                        key={type}
                        pressed={errorType === type}
                        title={hint}
                        onToggle={() => setErrorType(question.id, errorType === type ? undefined : type)}
                      >
                        {label}
                      </ToggleChip>
                    );
                  })}
                </div>
              </fieldset>
            )}
            <Explanation question={question} />
          </Card>
        )}
      </div>
    </li>
  );
}

interface ExportPanelProps {
  examId: string;
  finishedAt: number;
  results: QuestionResult[];
  extras: (id: string) => ResultExtras;
  errors: number;
  classified: number;
}

const SESSION_PATTERN = /^S\d{1,4}$/;

function ExportPanel({ examId, finishedAt, results, extras, errors, classified }: ExportPanelProps) {
  const { t } = useI18n();
  const sessionId = useId();
  const [sessionLabel, setSessionLabel] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const validSession = SESSION_PATTERN.test(sessionLabel);
  const stamp = localStamp(finishedAt);

  const history = () => historyRows(results, extras, sessionLabel, finishedAt);

  return (
    <>
      <h2 className={styles.sectionTitle}>{t.results.export}</h2>
      {errors > 0 && <p className={styles.note}>{t.results.classified(classified, errors)}</p>}
      <div className={styles.actions}>
        <Button onClick={() => downloadText(`simulado-${examId}-${stamp}.csv`, toCsv(resultRows(results, extras), RESULT_COLUMNS))}>
          {t.results.downloadResult}
        </Button>
      </div>
      <p className={styles.note}>{t.results.resultNote}</p>

      <details className={styles.details}>
        <summary>{t.results.historyTitle}</summary>
        <p className={styles.note}>{t.results.historyNote}</p>
        <div className={styles.sessionField}>
          <div>
            <label className={styles.fieldLabel} htmlFor={sessionId}>
              {t.results.session}
            </label>
            <input
              id={sessionId}
              value={sessionLabel}
              placeholder={t.results.sessionHelp}
              maxLength={5}
              autoComplete="off"
              aria-invalid={sessionLabel !== '' && !validSession}
              onChange={(e) => setSessionLabel(e.target.value.trim().toUpperCase())}
            />
          </div>
          <Button variant="ghost" disabled={!validSession} onClick={() => downloadText(`historico-${examId}-${stamp}.csv`, toCsv(history(), HISTORY_COLUMNS))}>
            {t.results.downloadHistory}
          </Button>
          <Button
            variant="ghost"
            disabled={!validSession}
            onClick={async () => setCopyStatus((await copyText(toCsv(history()))) ? t.results.copied : t.results.copyFailed)}
          >
            {t.results.copyHistory}
          </Button>
          <span role="status" className={styles.note}>
            {copyStatus}
          </span>
        </div>
      </details>
    </>
  );
}

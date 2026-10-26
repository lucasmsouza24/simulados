import { useId, useState, type FormEvent } from 'react';
import { useCatalog } from '../../app/catalog';
import { Button } from '../../components/ui/Button';
import { Card, Notice } from '../../components/ui/Card';
import { previewComposition } from '../../domain/compose';
import { useI18n } from '../../i18n/useI18n';
import { readStorage, writeStorage } from '../../lib/storage';
import { clampSetup, MAX_MINUTES, SetupSchema, type Setup } from './session';
import { useExamSession } from './sessionContext';
import styles from './exam.module.css';

export function ExamSetup() {
  const catalog = useCatalog();
  const { exam } = catalog;
  const { t, l } = useI18n();
  const { start } = useExamSession();
  const ids = { count: useId(), minutes: useId(), countHelp: useId(), minutesHelp: useId() };
  const storageKey = `setup:${exam.id}`;

  const [setup, setSetup] = useState<Setup>(() => clampSetup(exam, readStorage(storageKey, SetupSchema.partial())));
  const [minutesDraft, setMinutesDraft] = useState(String(setup.minutes));

  const update = (patch: Partial<Setup>) => {
    const next = clampSetup(exam, { ...setup, ...patch });
    setSetup(next);
    writeStorage(storageKey, next);
    return next;
  };

  const preview = previewComposition(catalog, setup.count);
  const missing = exam.domains.filter((d) => preview.missingDomains.includes(d.id)).map((d) => l(d.name));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    start(update({ minutes: Number(minutesDraft) }));
  };

  if (preview.totalAvailable === 0) {
    return (
      <div className={styles.page}>
        <h1>{t.exam.title}</h1>
        <p className={styles.lead}>{t.exam.noQuestions}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1>{t.exam.title}</h1>
      <p className={styles.lead}>
        {l(exam.name)}. {t.exam.lead}
      </p>
      <Card>
        <form onSubmit={onSubmit}>
          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor={ids.count}>{t.exam.count}</label>
              <div className={styles.rangeRow}>
                <input
                  id={ids.count}
                  type="range"
                  min={exam.questionCount.min}
                  max={exam.questionCount.max}
                  step={1}
                  value={setup.count}
                  aria-describedby={ids.countHelp}
                  onChange={(e) => update({ count: Number(e.target.value) })}
                />
                <output htmlFor={ids.count}>{setup.count}</output>
              </div>
              <p className={styles.help} id={ids.countHelp}>
                {t.exam.countHelp(exam.questionCount.min, exam.questionCount.max)}
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor={ids.minutes}>{t.exam.minutes}</label>
              <input
                id={ids.minutes}
                className={styles.number}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_MINUTES}
                value={minutesDraft}
                aria-describedby={ids.minutesHelp}
                onChange={(e) => setMinutesDraft(e.target.value)}
                onBlur={() => setMinutesDraft(String(update({ minutes: Number(minutesDraft) }).minutes))}
              />
              <p className={styles.help} id={ids.minutesHelp}>
                {t.exam.minutesHelp(exam.durationMinutes)}
              </p>
            </div>

            <label className={styles.check}>
              <input type="checkbox" checked={setup.askConfidence} onChange={(e) => update({ askConfidence: e.target.checked })} />
              {t.exam.askConfidence}
            </label>
          </div>

          <h2 className={styles.sectionTitle}>{t.exam.composition}</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t.exam.domain}</th>
                <th scope="col" className={styles.num}>
                  {t.exam.weight}
                </th>
                <th scope="col" className={styles.num}>
                  {t.exam.inBank}
                </th>
                <th scope="col" className={styles.num}>
                  {t.exam.planned}
                </th>
              </tr>
            </thead>
            <tbody>
              {exam.domains.map((d) => (
                <tr key={d.id}>
                  <td>{l(d.name)}</td>
                  <td className={styles.num}>
                    {d.weight[0]}–{d.weight[1]}%
                  </td>
                  <td className={styles.num}>{preview.available[d.id]}</td>
                  <td className={styles.num}>{preview.planned[d.id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>{t.exam.weightsNote}</p>
          {missing.length > 0 && <Notice>{t.exam.missingDomains(missing.join(', '))}</Notice>}
          {preview.totalAvailable < setup.count && <Notice>{t.exam.shortBank(preview.totalAvailable, setup.count)}</Notice>}

          <div className={styles.actions}>
            <Button type="submit">{t.exam.start}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import { useCatalog } from '../../app/catalog';
import { Button } from '../../components/ui/Button';
import { Shortcuts } from '../../components/ui/Shortcuts';
import { QUESTION_FORMATS, type Question } from '../../content/schema';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useI18n } from '../../i18n/useI18n';
import { readStorage, writeStorage } from '../../lib/storage';
import { useExamSession } from '../exam/sessionContext';
import { applyFilters, FILTER_PARAMS, readFilters, type BankFilters } from './filters';
import { BankQuestion, type BankQuestionHandle } from './BankQuestion';
import { useBankProgress } from './bankProgress';
import styles from './bank.module.css';

export function BankPage() {
  const catalog = useCatalog();
  const { exam } = catalog;
  const { t, l } = useI18n();
  const { locked } = useExamSession();
  const { entries } = useBankProgress();
  const { questionId } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const questionRef = useRef<BankQuestionHandle>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [study, setStudy] = useState(() => readStorage('bank:study', z.boolean()) ?? false);

  useDocumentTitle(`${t.bank.title} · ${exam.code} · ${t.appName}`);

  const filters = readFilters(params);
  const list = applyFilters(catalog, filters);
  const selected = (questionId && catalog.byId.get(questionId)) || list[0];
  const position = selected ? list.indexOf(selected) : -1;

  useEffect(() => {
    listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected?.id]);

  const setFilter = (key: keyof BankFilters, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(FILTER_PARAMS[key], value);
        else next.delete(FILTER_PARAMS[key]);
        return next;
      },
      { replace: key === 'q' },
    );

  const open = (question: Question | undefined) => {
    if (!question) return;
    navigate({ pathname: `/${exam.id}/questoes/${encodeURIComponent(question.id)}`, search: location.search });
    setSidebarOpen(false);
  };

  useHotkeys(
    {
      ArrowLeft: () => open(list[position - 1]),
      ArrowRight: () => open(list[position < 0 ? 0 : position + 1]),
      a: () => questionRef.current?.pick('A'),
      b: () => questionRef.current?.pick('B'),
      c: () => questionRef.current?.pick('C'),
      d: () => questionRef.current?.pick('D'),
      e: () => questionRef.current?.pick('E'),
      Enter: () => questionRef.current?.check(),
      r: () => questionRef.current?.reveal(),
      '/': () => searchRef.current?.focus(),
    },
    !locked,
  );

  if (locked) return <Navigate to={`/${exam.id}`} replace />;

  const done = Object.values(entries).filter((e) => e.checked);
  const groups: { key: string; label: string | null; items: Question[] }[] = [];
  for (const q of list) {
    const groupKey = filters.seed ? 'all' : q.requirement;
    let group = groups[groups.length - 1];
    if (!group || group.key !== groupKey) {
      const info = catalog.requirements.get(q.requirement);
      group = { key: groupKey, label: filters.seed ? null : info ? `${q.requirement} · ${l(info.requirement.name)}` : q.requirement, items: [] };
      groups.push(group);
    }
    group.items.push(q);
  }

  const statusOf = (id: string) => {
    const e = entries[id];
    if (e?.checked) return e.correct ? 'ok' : 'bad';
    return e?.revealed ? 'seen' : undefined;
  };
  const statusText = { ok: t.bank.statusOk, bad: t.bank.statusBad, seen: t.bank.statusSeen };

  return (
    <div className={styles.layout}>
      <Button
        variant="ghost"
        className={styles.toggle}
        aria-expanded={sidebarOpen}
        aria-controls={sidebarId}
        onClick={() => setSidebarOpen((v) => !v)}
      >
        ☰ {t.bank.toggleSidebar}
      </Button>

      <aside id={sidebarId} className={styles.sidebar} data-open={sidebarOpen}>
        <form className={styles.filters} role="search" aria-label={t.bank.filters} onSubmit={(e) => e.preventDefault()}>
          <label>
            {t.bank.search}
            <input
              ref={searchRef}
              className={styles.input}
              type="search"
              value={filters.q}
              placeholder={t.bank.searchPlaceholder}
              maxLength={200}
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </label>
          <label>
            {t.bank.domain}
            <select className={styles.input} value={filters.domain} onChange={(e) => setFilter('domain', e.target.value)}>
              <option value="">{t.bank.all}</option>
              {exam.domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {l(d.name)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.bank.requirement}
            <select className={styles.input} value={filters.requirement} onChange={(e) => setFilter('requirement', e.target.value)}>
              <option value="">{t.bank.all}</option>
              {exam.domains
                .filter((d) => !filters.domain || d.id === filters.domain)
                .flatMap((d) => d.sections)
                .map((s) => (
                  <optgroup key={s.id} label={l(s.name)}>
                    {s.requirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} · {l(r.name)}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </label>
          <label>
            {t.bank.format}
            <select className={styles.input} value={filters.format} onChange={(e) => setFilter('format', e.target.value)}>
              <option value="">{t.bank.all}</option>
              {QUESTION_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {t.formats[f]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.bank.level}
            <select className={styles.input} value={filters.level} onChange={(e) => setFilter('level', e.target.value)}>
              <option value="">{t.bank.all}</option>
              <option value="essential">{t.levels.essential}</option>
              <option value="detail">{t.levels.detail}</option>
            </select>
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={study}
              onChange={(e) => {
                setStudy(e.target.checked);
                writeStorage('bank:study', e.target.checked);
              }}
            />
            {t.bank.studyMode}
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={Boolean(filters.seed)}
              onChange={(e) => setFilter('seed', e.target.checked ? String(Math.floor(Math.random() * 1e9)) : '')}
            />
            {t.bank.shuffle}
          </label>
        </form>

        <div className={styles.meta}>
          <span>{t.bank.count(list.length, catalog.questions.length)}</span>
          {done.length > 0 && <span>{t.bank.score(done.filter((e) => e.correct).length, done.length)}</span>}
        </div>

        <nav ref={listRef} aria-label={t.bank.list} className={styles.list}>
          {groups.map((g) => (
            <div key={g.key} role="group" aria-label={g.label ?? t.bank.list}>
              {g.label && (
                <div className={styles.group} aria-hidden="true">
                  {g.label}
                </div>
              )}
              {g.items.map((q) => {
                const status = statusOf(q.id);
                return (
                  <Link
                    key={q.id}
                    className={styles.item}
                    to={{ pathname: `/${exam.id}/questoes/${encodeURIComponent(q.id)}`, search: location.search }}
                    aria-current={q === selected ? 'page' : undefined}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className={styles.dot} data-status={status} />
                    <span className={styles.itemId}>{q.id}</span>
                    {status && <span className="visually-hidden">({statusText[status]})</span>}
                    <span className={styles.itemFormat}>{t.formatsShort[q.format]}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className={styles.main} id="main" tabIndex={-1}>
        <h1 className="visually-hidden">{t.bank.title}</h1>
        {selected ? (
          <>
            <BankQuestion key={selected.id} ref={questionRef} question={selected} study={study} />
            <div className={styles.pager}>
              <Button variant="ghost" disabled={position <= 0} onClick={() => open(list[position - 1])}>
                {t.pager.prev}
              </Button>
              <span>{position >= 0 ? t.pager.position(position + 1, list.length) : ''}</span>
              <Button variant="ghost" disabled={position >= list.length - 1} onClick={() => open(list[position < 0 ? 0 : position + 1])}>
                {t.pager.next}
              </Button>
            </div>
            <Shortcuts
              shortcuts={[
                { keys: ['←', '→'], label: t.shortcuts.navigate },
                { keys: ['A–E'], label: t.shortcuts.pick },
                { keys: ['Enter'], label: t.shortcuts.check },
                { keys: ['R'], label: t.shortcuts.reveal },
                { keys: ['/'], label: t.shortcuts.search },
              ]}
            />
          </>
        ) : (
          <div>
            <p className={styles.empty}>{t.bank.empty}</p>
            <Button variant="ghost" onClick={() => setParams(new URLSearchParams())}>
              {t.bank.clear}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

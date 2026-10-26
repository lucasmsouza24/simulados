import { useEffect, useReducer, useState, type ReactNode } from 'react';
import type { Catalog } from '../../domain/catalog';
import { composeExam } from '../../domain/compose';
import { readStorage, removeStorage, writeStorage } from '../../lib/storage';
import { reducer, restore, SessionSchema } from './session';
import { ExamSessionContext, type ExamSessionApi } from './sessionContext';

export function ExamSessionProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const storageKey = `exam:${catalog.exam.id}`;
  const [session, dispatch] = useReducer(reducer, null, () =>
    restore(readStorage(storageKey, SessionSchema), catalog, Date.now()),
  );
  const [now, setNow] = useState(() => Date.now());
  const running = session?.status === 'running';
  const endsAt = session?.endsAt;

  useEffect(() => {
    if (session) writeStorage(storageKey, session);
    else removeStorage(storageKey);
  }, [session, storageKey]);

  useEffect(() => {
    if (!running || endsAt === undefined) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      if (t >= endsAt) dispatch({ type: 'finish', at: endsAt, timeUp: true });
      else setNow(t);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, endsAt]);

  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [running]);

  const api: ExamSessionApi = {
    session,
    now,
    locked: running,
    start: (config) => {
      const { weights, questionIds } = composeExam(catalog, config.count, Math.random);
      if (questionIds.length === 0) return;
      const at = Date.now();
      setNow(at);
      dispatch({ type: 'start', examId: catalog.exam.id, config, weights, questionIds, at });
    },
    answer: (id, response) => dispatch({ type: 'answer', id, response }),
    setConfidence: (id, value) => dispatch({ type: 'confidence', id, value }),
    toggleFlag: (id) => dispatch({ type: 'flag', id }),
    goTo: (index) => dispatch({ type: 'goto', index }),
    finish: () => dispatch({ type: 'finish', at: Date.now(), timeUp: false }),
    discard: () => dispatch({ type: 'discard' }),
    setErrorType: (id, value) => dispatch({ type: 'errorType', id, value }),
  };

  return <ExamSessionContext value={api}>{children}</ExamSessionContext>;
}

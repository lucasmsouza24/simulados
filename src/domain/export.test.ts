import { describe, expect, it } from 'vitest';
import { escapeCsvCell, parseCsv, toCsv } from '../lib/csv';
import { makeCatalog, matching, multi, single, yesNo } from '../test/fixtures';
import { errorsLast, historyRows, resultRows } from './export';
import { scoreExam } from './scoring';

describe('csv', () => {
  it('quotes separators and neutralizes formulas', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvCell('-1')).toBe("'-1");
    expect(escapeCsvCell(0.5)).toBe('0.5');
  });

  it('round-trips through the parser', () => {
    const csv = toCsv([['1', 'line\nbreak', 'x,y']], ['a', 'b', 'c']);
    expect(parseCsv(csv)).toEqual([{ a: '1', b: 'line\nbreak', c: 'x,y' }]);
  });
});

describe('exports', () => {
  const questions = [single('Q1', 'N01'), yesNo('Q2', 'N02'), multi('Q3', 'A01'), matching('Q4', 'G01')];
  const catalog = makeCatalog(questions);
  const responses: Record<string, unknown> = {
    Q1: 'C',
    Q2: { '1': true, '2': true, '3': true },
    Q3: ['B'],
  };
  const score = scoreExam(catalog, questions, (id) => responses[id] as never);
  const extras = (id: string) => (id === 'Q2' ? { confidence: 'D' as const, errorType: 'pegadinha' as const } : { confidence: 'C' as const });

  it('scores and classifies each question', () => {
    expect(score.counts).toEqual({ ok: 1, partial: 2, bad: 0, blank: 1 });
    expect(score.scaled).toBe(Math.round(((1 + 2 / 3 + 0.5) / 4) * 1000));
  });

  it('builds the generic result rows', () => {
    const rows = resultRows(score.results, extras);
    expect(rows[1]).toEqual([2, 'Q2', 'N02', 'assunto Q2', 'yes-no', 'essential', 'partial', 0.667, '1:Y 2:Y 3:Y', '1:N 2:Y 3:Y', 'D', 'pegadinha']);
    expect(rows[3]?.[6]).toBe('blank');
  });

  it('builds history rows per scorable item with errors last in each group', () => {
    const rows = historyRows(score.results, extras, 'S20', new Date(2026, 9, 25, 18, 0).getTime());
    const q2 = rows.filter((r) => r[9]?.includes('Q2'));
    expect(q2.map((r) => r[6])).toEqual(['certo', 'certo', 'errado']);
    expect(q2[2]).toEqual(['2026-10-25', 'S20', 'N02', 'assunto Q2', 'sim-nao', 'essencial', 'errado', 'D', 'pegadinha', 'simulado Q2 item 1 marcou S gabarito N']);
    expect(rows.find((r) => r[9] === 'simulado Q4 item 1 sem resposta')).toBeDefined();
  });

  it('keeps the first appearance order of each group', () => {
    const rows = [
      ['d', 's', 'N01', 'x', '', '', 'errado'],
      ['d', 's', 'N02', 'y', '', '', 'certo'],
      ['d', 's', 'N01', 'x', '', '', 'certo'],
    ];
    expect(errorsLast(rows).map((r) => `${r[2]}-${r[6]}`)).toEqual(['N01-certo', 'N01-errado', 'N02-certo']);
  });
});

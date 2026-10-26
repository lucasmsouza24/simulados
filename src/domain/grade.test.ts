import { describe, expect, it } from 'vitest';
import { fillIn, matching, multi, single, yesNo } from '../test/fixtures';
import { grade, isAnswered, isComplete } from './grade';

describe('grade', () => {
  it('scores single choice and fill-in all or nothing', () => {
    expect(grade(single('Q1'), 'C')).toMatchObject({ score: 1, correct: true });
    expect(grade(single('Q1'), 'A')).toMatchObject({ score: 0, correct: false });
    expect(grade(fillIn('Q2'), 'A')).toMatchObject({ score: 1, correct: true });
  });

  it('gives partial credit on multi-select, cancelling one right pick per wrong pick', () => {
    const q = multi('Q1');
    expect(grade(q, ['B', 'E'])).toMatchObject({ score: 1, correct: true });
    expect(grade(q, ['B'])).toMatchObject({ score: 0.5, correct: false });
    expect(grade(q, ['B', 'C', 'E'])).toMatchObject({ score: 0.5, correct: false });
    expect(grade(q, ['A', 'C'])).toMatchObject({ score: 0, correct: false });
  });

  it('gives one share per right item on yes-no and matching', () => {
    expect(grade(yesNo('Q1'), { '1': false, '2': true, '3': false })).toMatchObject({ score: 2 / 3, right: 2, total: 3 });
    expect(grade(matching('Q2'), { '1': 'C', '2': 'A', '3': 'D' })).toMatchObject({ score: 1, correct: true });
    expect(grade(matching('Q2'), { '1': 'A' })).toMatchObject({ score: 0, right: 0, total: 3 });
  });

  it('ignores responses of the wrong shape (e.g. tampered storage)', () => {
    expect(grade(single('Q1'), ['C'])).toMatchObject({ score: 0 });
    expect(grade(yesNo('Q1'), 'S')).toMatchObject({ score: 0 });
    expect(grade(multi('Q1'), { B: true })).toMatchObject({ score: 0 });
  });
});

describe('isComplete / isAnswered', () => {
  it('requires every part for completion but any part for answered', () => {
    const q = yesNo('Q1');
    expect(isAnswered(q, { '1': true })).toBe(true);
    expect(isComplete(q, { '1': true })).toBe(false);
    expect(isComplete(q, { '1': true, '2': false, '3': true })).toBe(true);
  });

  it('treats empty selections as unanswered', () => {
    expect(isAnswered(multi('Q1'), [])).toBe(false);
    expect(isAnswered(matching('Q1'), { '1': '' })).toBe(false);
    expect(isAnswered(single('Q1'), undefined)).toBe(false);
  });
});

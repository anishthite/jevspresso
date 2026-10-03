import { describe, expect, it } from 'vitest';
import {
  answersToParsedOrder,
  buildParseQuestions,
  qId,
  type Answers,
} from './jev-core';
import { DRINK_IDS } from './recipes';

const noul = (n: number) => ({ type: 'noul' as const, noul: n });
const choice = (c: string, probabilities: Record<string, number>, confidence: number) => ({
  type: 'choice' as const,
  choice: c,
  probabilities,
  confidence,
});

/** Every drink absent, every modifier unstated — a blank slate to layer on. */
function blank(): Answers {
  const a: Answers = {
    [qId.intent]: choice('order', { order: 0.95, cancel: 0.02, question: 0.02, other: 0.01 }, 0.93),
  };
  for (const d of DRINK_IDS) {
    a[qId.present(d)] = noul(0.02);
    a[qId.qty(d)] = choice('1', { '1': 0.9, '2': 0.07, '3': 0.03 }, 0.85);
    a[qId.milk(d)] = choice('whole', { whole: 0.8, oat: 0.1, almond: 0.05, soy: 0.03, none: 0.02 }, 0.75);
    a[qId.milkStated(d)] = noul(0.05);
    a[qId.size(d)] = choice('regular', { small: 0.1, regular: 0.85, large: 0.05 }, 0.8);
    a[qId.sizeStated(d)] = noul(0.05);
    a[qId.decaf(d)] = noul(0.03);
    a[qId.iced(d)] = noul(0.03);
  }
  return a;
}

describe('answersToParsedOrder', () => {
  it('maps answers to typed items and only keeps stated modifiers', () => {
    const a = blank();
    a[qId.present('cappuccino')] = noul(0.95);
    a[qId.milkStated('cappuccino')] = noul(0.92);
    a[qId.milk('cappuccino')] = choice('almond', { whole: 0.05, oat: 0.05, almond: 0.85, soy: 0.03, none: 0.02 }, 0.82);
    a[qId.present('espresso')] = noul(0.9);
    a[qId.qty('espresso')] = choice('2', { '1': 0.15, '2': 0.8, '3': 0.05 }, 0.76);

    const parsed = answersToParsedOrder(a, { latencyMs: 42 });
    expect(parsed.intent).toBe('order');
    expect(parsed.items).toEqual([
      { drink: 'espresso', qty: 2, milk: undefined, size: undefined, decaf: false, iced: false },
      { drink: 'cappuccino', qty: 1, milk: 'almond', size: undefined, decaf: false, iced: false },
    ]);
    expect(parsed.latencyMs).toBe(42);
  });

  it('takes confidence as the minimum over the judgments it used', () => {
    const a = blank();
    a[qId.present('latte')] = noul(0.95); // noul confidence 0.9
    a[qId.qty('latte')] = choice('1', { '1': 0.6, '2': 0.3, '3': 0.1 }, 0.41); // the weak link
    const parsed = answersToParsedOrder(a, { latencyMs: 1 });
    expect(parsed.confidence).toBe(0.41);
    expect(parsed.confidence).toBeLessThan(0.5); // -> routes to the clarify state
  });

  it('drops drinks whose presence noul is below the midpoint', () => {
    const a = blank();
    a[qId.present('mocha')] = noul(0.49);
    expect(answersToParsedOrder(a, { latencyMs: 1 }).items).toEqual([]);
  });

  it('builds one question per drink modifier plus the intent', () => {
    const questions = buildParseQuestions();
    expect(Object.keys(questions)).toHaveLength(DRINK_IDS.length * 8 + 1);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluatePair, findMatches } from './match';

const base = { user_id: 'u', name: 'X', seeking: 'needs_room', city: 'Seattle', areas: ['South Lake Union'], budget_amount: 1500, budget_basis: 'person',
  move_in: '2027-06-01', move_out: '2027-08-31', occupation_or_school: null, cleanliness: 'unknown', sleep_schedule: 'unknown',
  smoking: 'unknown', pets: 'unknown', social_style: 'unknown', other_traits: [], evidence: [] };
const P = (id, o = {}) => ({ ...base, id, user_id: id, name: id, ...o });
const status = (ev, id) => ev.criteria.find((c) => c.id === id)?.status;

test('search budget is a maximum: lower budgets remain eligible, higher budgets do not', () => {
  const me = P('me', { budget_amount: 2150 });
  const lower = evaluatePair(me, P('lower', { budget_amount: 1400 }), { budgetIsMaximum: true });
  assert.equal(status(lower, 'budget'), 'matched');
  assert.equal(lower.hardConflict, false);
  assert.equal(status(evaluatePair(me, P('equal', { budget_amount: 2150 }), { budgetIsMaximum: true }), 'budget'), 'matched');
  assert.equal(evaluatePair(me, P('higher', { budget_amount: 2200 }), { budgetIsMaximum: true }).hardConflict, true);
  assert.equal(status(evaluatePair(me, P('unknown', { budget_amount: null }), { budgetIsMaximum: true }), 'budget'), 'unknown');
  assert.equal(status(evaluatePair(me, P('home', { budget_basis: 'home' }), { budgetIsMaximum: true }), 'budget'), 'unknown');
  assert.equal(evaluatePair(me, P('elsewhere', { city: 'Vancouver' }), { budgetIsMaximum: true }).hardConflict, true);
  assert.equal(evaluatePair(me, P('later', { move_in: '2027-09-01' }), { budgetIsMaximum: true }).hardConflict, true);
});

test('two seekers form a household; a has_room + seeker fills a room; two has_room never pair', () => {
  assert.equal(evaluatePair(P('a'), P('b')).kind, 'household');
  assert.equal(evaluatePair(P('a'), P('b', { seeking: 'has_room' })).kind, 'fill_room');
  assert.equal(evaluatePair(P('a', { seeking: 'has_room' }), P('b', { seeking: 'has_room' })), null);
});
test('budget: different bases or missing amounts are unknown, never matched', () => {
  assert.equal(status(evaluatePair(P('a'), P('b', { budget_basis: 'home' })), 'budget'), 'unknown');
  assert.equal(status(evaluatePair(P('a'), P('b', { budget_amount: null })), 'budget'), 'unknown');
  assert.equal(status(evaluatePair(P('a'), P('b', { budget_amount: 1400 })), 'budget'), 'matched');
  assert.equal(status(evaluatePair(P('a'), P('b', { budget_amount: 800 })), 'budget'), 'conflict');
});
test('dates: no overlap is a conflict; missing dates are unknown', () => {
  assert.equal(status(evaluatePair(P('a'), P('b', { move_in: '2027-09-01', move_out: '2027-12-01' })), 'dates'), 'conflict');
  assert.equal(status(evaluatePair(P('a'), P('b', { move_in: null })), 'dates'), 'unknown');
});
test('lifestyle is only judged when both people stated it', () => {
  const ev = evaluatePair(P('a', { smoking: 'non_smoker' }), P('b'));
  assert.equal(ev.criteria.some((c) => c.id === 'smoking'), false);
  const bad = evaluatePair(P('a', { sleep_schedule: 'early' }), P('b', { sleep_schedule: 'night' }));
  assert.equal(status(bad, 'sleep'), 'conflict');
});
test('findMatches drops hard conflicts, ranks fewer conflicts first, and never pairs you with yourself', async () => {
  const me = P('me', { smoking: 'non_smoker', sleep_schedule: 'early' });
  const out = await findMatches(me, [
    me,
    P('far', { areas: ['Ballard'] }),                                              // hard conflict: dropped
    P('clash', { sleep_schedule: 'night' }),                                       // soft conflict
    P('good', { smoking: 'non_smoker', sleep_schedule: 'early' }),                 // best
  ], { useMuse: false });
  assert.deepEqual(out.map((m) => m.profile.id), ['good', 'clash']);
  assert.equal(out[0].explanation.by, 'code');
});
test('a different city is a hard conflict even when neighborhoods are unspecified (the "California" bug)', async () => {
  const me = P('me', { city: 'California', areas: [] });
  assert.equal(status(evaluatePair(me, P('sea', { city: 'Seattle', areas: [] }))!, 'city'), 'conflict');
  const out = await findMatches(me, [P('sea', { city: 'Seattle', areas: [] }), P('la', { city: 'California', areas: [] })], { useMuse: false });
  assert.deepEqual(out.map((m) => m.profile.id), ['la']);
});
test('city comparison ignores case and ", WA"; a missing profile city is unknown, never a match', () => {
  assert.equal(status(evaluatePair(P('a', { city: 'Seattle, WA' }), P('b', { city: 'seattle' }))!, 'city'), 'matched');
  assert.equal(status(evaluatePair(P('a', { city: 'Seattle' }), P('b', { city: null }))!, 'city'), 'unknown');
});
test('neighborhoods are not compared across different cities', () => {
  const ev = evaluatePair(P('a', { city: 'Seattle', areas: ['Ballard'] }), P('b', { city: 'Vancouver', areas: ['Kitsilano'] }))!;
  assert.equal(ev.criteria.some((c) => c.id === 'area'), false);
  assert.equal(ev.hardConflict, true);
});

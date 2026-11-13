import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluatePair, findMatches } from './match';

const base = { user_id: 'u', name: 'X', seeking: 'needs_room', city: 'Seattle', areas: ['South Lake Union'], budget_amount: 1500, budget_basis: 'person',
  move_in: '2027-06-01', move_out: '2027-08-31', occupation_or_school: null, cleanliness: 'unknown', sleep_schedule: 'unknown',
  smoking: 'unknown', pets: 'unknown', social_style: 'unknown', other_traits: [], evidence: [] };
const P = (id, o = {}) => ({ ...base, id, user_id: id, name: id, ...o });
const status = (ev, id) => ev.criteria.find((c) => c.id === id)?.status;

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

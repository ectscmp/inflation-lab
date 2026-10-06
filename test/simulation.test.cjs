const assert = require('node:assert/strict');
const { test } = require('node:test');
const { calculate } = require('../dist/app.js');
const { CHALLENGE_ROUNDS, scoreChallengeRound } = require('../dist/challenge.js');

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('the basket and index start at 100 and do not depend on savings or interest', () => {
  const base = calculate(100, 3, 1, 0);
  near(base.basket, 100);
  near(base.priceIndex, 100);
  const example = calculate(100, 10, 0, 1);
  near(example.basket, 110);
  near(example.priceIndex, 110);
  const otherSaver = calculate(1000, 10, 15, 1);
  near(otherSaver.basket, example.basket);
  near(otherSaver.priceIndex, example.priceIndex);
});

test('deflation lowers prices while unchanged savings gain purchasing power', () => {
  const result = calculate(100, -2, 0, 1);
  near(result.balance, 100);
  near(result.lunch, 9.8);
  near(result.basket, 98);
  near(result.priceIndex, 98);
  near(result.purchasing, 100 / 0.98);
  assert.ok(result.change > 0);
  assert.ok(calculate(20, -5, 0, 30).purchasing > 20);
});

test('lower positive inflation still increases the price index', () => {
  assert.ok(calculate(100, 2, 0, 1).priceIndex > 100);
  assert.ok(calculate(100, 2, 0, 1).priceIndex < calculate(100, 5, 0, 1).priceIndex);
  near(calculate(100, 0, 0, 30).priceIndex, 100);
});

test('the classroom answer key and finale still agree with the model', () => {
  for (const round of CHALLENGE_ROUNDS.slice(0, 4)) {
    const change = calculate(100, round.inflation, round.interest, round.years).change;
    const answer = Math.abs(change) < 1e-8 ? 'same' : change > 0 ? 'more' : 'less';
    assert.equal(round.answer, answer);
  }
  const finale = CHALLENGE_ROUNDS.at(-1);
  const result = calculate(100, finale.inflation, finale.interest, finale.years);
  assert.equal(result.purchasing.toFixed(2), '82.19');
  assert.deepEqual(scoreChallengeRound(finale, { revealed: true, predictions: [82.19, 82.19, 80, null, 100] }, calculate), [2, 2, 0, 0, 0]);
});

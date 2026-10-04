import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFENCE_WEIGHT,
  SCORE_MAX,
  SUPERVISOR_CRITERIA,
  SUPERVISOR_WEIGHT,
  calculateFinalScore,
  calculateReportScore,
  classifyScore,
  describeResult,
  isWithinRange,
  normalizeScore,
} from "./scores.js";

const fullBreakdown = (value) =>
  Object.fromEntries(SUPERVISOR_CRITERIA.map((criterion) => [criterion.key, value]));

test("the criteria weights account for exactly the whole report score", () => {
  const total = SUPERVISOR_CRITERIA.reduce((sum, criterion) => sum + criterion.weight, 0);

  // If this drifts, a perfect report stops scoring 100 and the final score
  // silently gains a ceiling below SCORE_MAX.
  assert.equal(total, SCORE_MAX);
});

test("the two components carry equal weight", () => {
  assert.equal(SUPERVISOR_WEIGHT + DEFENCE_WEIGHT, 1);
  assert.equal(SUPERVISOR_WEIGHT, DEFENCE_WEIGHT);
});

test("calculateReportScore weights each criterion and totals to 0-100", () => {
  assert.equal(calculateReportScore(fullBreakdown(100)), 100);
  assert.equal(calculateReportScore(fullBreakdown(0)), 0);
  assert.equal(calculateReportScore(fullBreakdown(50)), 50);
});

test("calculateReportScore returns null when any criterion is unmarked", () => {
  const partial = { ...fullBreakdown(80) };
  delete partial.methodology;

  assert.equal(calculateReportScore(partial), null);
  assert.equal(calculateReportScore({}), null);
  assert.equal(calculateReportScore(undefined), null);
});

test("calculateReportScore rejects marks outside the scale", () => {
  assert.equal(calculateReportScore(fullBreakdown(101)), null);
  assert.equal(calculateReportScore(fullBreakdown(-1)), null);
  // A blank input is "unmarked", not a zero.
  assert.equal(calculateReportScore(fullBreakdown("")), null);
});

test("the final score is an even split of the two components", () => {
  assert.equal(
    calculateFinalScore({ supervisorScore: 70, defenceScore: 80 }),
    75,
  );
  assert.equal(calculateFinalScore({ supervisorScore: 60, defenceScore: 60 }), 60);
  assert.equal(calculateFinalScore({ supervisorScore: 0, defenceScore: 100 }), 50);
});

test("a component scored on a different maximum is normalised first", () => {
  // 40 out of 50 is 80%, which must count the same as 80 out of 100.
  assert.equal(
    calculateFinalScore({
      supervisorScore: 40,
      supervisorMax: 50,
      defenceScore: 80,
      defenceMax: 100,
    }),
    80,
  );
});

test("the final score stays null until both components exist", () => {
  assert.equal(calculateFinalScore({ supervisorScore: 70 }), null);
  assert.equal(calculateFinalScore({ defenceScore: 70 }), null);
  assert.equal(calculateFinalScore({}), null);
  assert.equal(calculateFinalScore(), null);
  // A blank form field must not be read as a zero.
  assert.equal(calculateFinalScore({ supervisorScore: "", defenceScore: 70 }), null);
});

test("normalizeScore rescales to the shared maximum", () => {
  assert.equal(normalizeScore(50, 100), 50);
  assert.equal(normalizeScore(25, 50), 50);
  assert.equal(normalizeScore(0, 100), 0);
  assert.equal(normalizeScore(10, 0), null);
  assert.equal(normalizeScore(null, 100), null);
});

test("grades fall on the agreed boundaries", () => {
  assert.equal(classifyScore(100), "A");
  assert.equal(classifyScore(70), "A");
  assert.equal(classifyScore(69.99), "B");
  assert.equal(classifyScore(60), "B");
  assert.equal(classifyScore(59.99), "C");
  assert.equal(classifyScore(50), "C");
  assert.equal(classifyScore(49.99), "D");
  assert.equal(classifyScore(40), "D");
  assert.equal(classifyScore(39.99), "F");
  assert.equal(classifyScore(0), "F");
});

test("an ungraded score has no classification", () => {
  assert.equal(classifyScore(null), null);
  assert.equal(classifyScore(""), null);
  assert.equal(classifyScore("not a number"), null);
});

test("classifyScore tolerates float noise that rounds onto a boundary", () => {
  // The raw sum of two weighted halves can land at 69.99999999999999.
  assert.equal(classifyScore(69.99999999999999), "A");
});

test("describeResult names what is still outstanding", () => {
  const neither = describeResult({});

  assert.equal(neither.ready, false);
  assert.equal(neither.finalScore, null);
  assert.equal(neither.grade, null);
  assert.deepEqual(neither.missing, ["supervisor score", "defence score"]);
});

test("describeResult reports only the missing component", () => {
  const noDefence = describeResult({ supervisorScore: 80 });

  assert.equal(noDefence.ready, false);
  assert.deepEqual(noDefence.missing, ["defence score"]);
});

test("describeResult is ready once both components are in, and grades the total", () => {
  const complete = describeResult({ supervisorScore: 74, defenceScore: 66 });

  assert.equal(complete.ready, true);
  assert.deepEqual(complete.missing, []);
  assert.equal(complete.finalScore, 70);
  assert.equal(complete.grade, "A");
});

test("isWithinRange accepts the boundaries and rejects everything outside", () => {
  assert.equal(isWithinRange(0, 100), true);
  assert.equal(isWithinRange(100, 100), true);
  assert.equal(isWithinRange(101, 100), false);
  assert.equal(isWithinRange(-1, 100), false);
  assert.equal(isWithinRange("85", 100), true);
  assert.equal(isWithinRange("", 100), false);
  assert.equal(isWithinRange("nope", 100), false);
});

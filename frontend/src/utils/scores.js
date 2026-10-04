// Two components make up a student's final score, and the same arithmetic has to
// happen in three places: on the server when a result is published, and in both
// portals when a score is being previewed. Keeping it here is what stops those
// three from drifting apart — the server stores what this module computes, and
// the client displays what the same functions compute.

export const SCORE_MAX = 100;
export const SUPERVISOR_WEIGHT = 0.5;
export const DEFENCE_WEIGHT = 0.5;

// The project report criteria a supervisor marks against. Each is scored out of
// SCORE_MAX and carries a share of the report total; the weights sum to 100, so
// the weighted total is already on the 0–100 scale the final score expects.
export const SUPERVISOR_CRITERIA = [
  { key: "research", label: "Research quality", weight: 25 },
  { key: "methodology", label: "Methodology", weight: 20 },
  { key: "writing", label: "Writing", weight: 20 },
  { key: "presentation", label: "Defence presentation", weight: 20 },
  { key: "originality", label: "Originality", weight: 15 },
];

// Highest band first: the first one whose floor the score reaches wins.
export const GRADE_BANDS = [
  { min: 70, grade: "A" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 40, grade: "D" },
  { min: 0, grade: "F" },
];

// Blank strings arrive from form inputs and must read as "no score", not as 0 —
// treating an empty input as a zero would publish a fail for an unmarked student.
const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Two decimals, so float noise (69.99999999) cannot tip a score across a grade
// boundary and disagree with what the coordinator sees on screen.
const round2 = (value) => Math.round(value * 100) / 100;

export function isWithinRange(value, max = SCORE_MAX) {
  const parsed = toNumber(value);
  const ceiling = toNumber(max);
  if (parsed === null || ceiling === null) return false;
  return parsed >= 0 && parsed <= ceiling;
}

// Both components are compared on a 0–100 scale, so a marker using a different
// maximum still contributes its correct share.
export function normalizeScore(score, max = SCORE_MAX) {
  const value = toNumber(score);
  const ceiling = toNumber(max);
  if (value === null || ceiling === null || ceiling <= 0) return null;

  return (value / ceiling) * SCORE_MAX;
}

// The weighted total a supervisor's per-criterion marks add up to. Returns null
// when any criterion is unmarked, so a half-filled form is never submitted.
export function calculateReportScore(breakdown = {}, criteria = SUPERVISOR_CRITERIA) {
  let total = 0;

  for (const criterion of criteria) {
    const value = toNumber(breakdown?.[criterion.key]);
    if (value === null || value < 0 || value > SCORE_MAX) return null;
    total += (value / SCORE_MAX) * criterion.weight;
  }

  return round2(total);
}

// Null until both components exist — the caller decides what to show meanwhile.
export function calculateFinalScore({
  supervisorScore,
  supervisorMax = SCORE_MAX,
  defenceScore,
  defenceMax = SCORE_MAX,
} = {}) {
  const supervisor = normalizeScore(supervisorScore, supervisorMax);
  const defence = normalizeScore(defenceScore, defenceMax);
  if (supervisor === null || defence === null) return null;

  return round2(supervisor * SUPERVISOR_WEIGHT + defence * DEFENCE_WEIGHT);
}

export function classifyScore(finalScore) {
  const value = toNumber(finalScore);
  if (value === null) return null;

  const rounded = round2(value);
  return GRADE_BANDS.find((band) => rounded >= band.min)?.grade ?? null;
}

// The single place that decides whether a result may be published, and what it
// is worth. Used by the publish route, which refuses when `missing` is non-empty.
export function describeResult(result = {}) {
  const {
    supervisorScore = null,
    supervisorMax = SCORE_MAX,
    defenceScore = null,
    defenceMax = SCORE_MAX,
  } = result ?? {};

  const missing = [];
  if (normalizeScore(supervisorScore, supervisorMax) === null) missing.push("supervisor score");
  if (normalizeScore(defenceScore, defenceMax) === null) missing.push("defence score");

  const finalScore = missing.length
    ? null
    : calculateFinalScore({ supervisorScore, supervisorMax, defenceScore, defenceMax });

  return {
    finalScore,
    grade: classifyScore(finalScore),
    missing,
    ready: missing.length === 0,
  };
}

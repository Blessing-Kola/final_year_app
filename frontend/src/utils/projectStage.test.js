import test from "node:test";
import assert from "node:assert/strict";
import {
  PROJECT_STAGE_INDEX,
  PROJECT_STATUS,
  PROJECT_TIMELINE,
  deriveProjectStage,
  isSubmittedProposal,
  progressForStage,
  readStageProgress,
} from "./projectStage.js";

const project = (overrides = {}) => ({
  id: "project-1",
  studentId: "student-1",
  stage: "proposal",
  status: "proposal",
  progress: 0,
  finalSubmittedAt: null,
  ...overrides,
});

// Chapters are numbered 1..5; only the statuses matter to the derivation.
const chapters = (...statuses) =>
  statuses.map((status, index) => ({ chapterNumber: index + 1, status }));

const NOT_STARTED = chapters("not_started", "not_started", "not_started", "not_started", "not_started");
const ALL_APPROVED = chapters("approved", "approved", "approved", "approved", "approved");
const ALL_SUBMITTED = chapters("approved", "approved", "submitted", "under_review", "submitted");

const submittedProposal = { id: "proposal-1", status: "submitted" };

test("the status map agrees with the timeline it was built from", () => {
  // Every stage has a machine key, and the two lists stay the same length. A
  // stage added to one and not the other would silently become undefined.
  assert.equal(Object.keys(PROJECT_STAGE_INDEX).length, PROJECT_TIMELINE.length);
  assert.equal(Object.keys(PROJECT_STATUS).length, PROJECT_TIMELINE.length);
  assert.equal(PROJECT_STATUS.chapterWriting, "chapter_writing");
  assert.equal(PROJECT_STATUS.finalSubmission, "final_submission");
});

test("progress picks out its own stage again", () => {
  // The client recovers the stage index from the percentage. If these two ever
  // disagree, the bar and the label point at different stages.
  for (const index of Object.values(PROJECT_STAGE_INDEX)) {
    if (index === PROJECT_STAGE_INDEX.finalSubmission) continue;
    const recovered = Math.floor((progressForStage(index) / 100) * PROJECT_TIMELINE.length);
    assert.equal(recovered, index, `progress ${progressForStage(index)} did not recover stage ${index}`);
  }
});

test("chapter writing still reports the value the hand-written constant used", () => {
  // 34 was CHAPTER_ONE_PROGRESS in server.js before the stage was derived here.
  // Keeping it means an open Chapter 1 reads the same before and after.
  assert.equal(progressForStage(PROJECT_STAGE_INDEX.chapterWriting), 34);
});

test("the final stage fills the bar, so the timeline reads as complete", () => {
  assert.equal(progressForStage(PROJECT_STAGE_INDEX.finalSubmission), 100);
  assert.equal(readStageProgress(project({ progress: 100 })).currentIndex, -1);
  assert.equal(readStageProgress(project({ progress: 100 })).currentStage, null);
});

test("progressForStage rejects anything that is not a stage", () => {
  assert.equal(progressForStage(-1), 0);
  assert.equal(progressForStage(Number.NaN), 0);
  assert.equal(progressForStage(undefined), 0);
});

test("a project with no records at all sits at the proposal stage", () => {
  const derived = deriveProjectStage({ project: project(), chapters: [], proposal: null });
  assert.equal(derived.stage, "Proposal");
  assert.equal(derived.status, "proposal");
  assert.equal(derived.index, 0);
});

test("there is no stage for a student with no project", () => {
  assert.equal(deriveProjectStage({ project: null, chapters: ALL_APPROVED }), null);
  assert.equal(deriveProjectStage(), null);
});

test("a submitted proposal waiting on a supervisor is its own stage", () => {
  const derived = deriveProjectStage({
    project: project(),
    chapters: NOT_STARTED,
    proposal: submittedProposal,
  });
  assert.equal(derived.stage, "Supervisor assigned");
  assert.equal(derived.status, "supervisor_assigned");
});

test("a draft proposal does not count as handed in", () => {
  const derived = deriveProjectStage({
    project: project(),
    chapters: NOT_STARTED,
    proposal: { status: "draft" },
  });
  assert.equal(derived.stage, "Proposal");
});

test("an assigned supervisor moves the project into chapter writing", () => {
  const derived = deriveProjectStage({
    project: project(),
    chapters: NOT_STARTED,
    proposal: submittedProposal,
    supervisorAssigned: true,
  });
  assert.equal(derived.stage, "Chapter writing");
  assert.equal(derived.progress, 34);
});

test("an opened chapter counts even before a supervisor is assigned", () => {
  // The alternative is a student who is already writing being shown an earlier
  // stage than the one they are working in.
  const derived = deriveProjectStage({
    project: project(),
    chapters: chapters("in_progress", "not_started", "not_started", "not_started", "not_started"),
    proposal: submittedProposal,
  });
  assert.equal(derived.stage, "Chapter writing");
});

test("every chapter handed in but not yet approved is the review stage", () => {
  const derived = deriveProjectStage({
    project: project(),
    chapters: ALL_SUBMITTED,
    proposal: submittedProposal,
    supervisorAssigned: true,
  });
  assert.equal(derived.stage, "Chapter review");
  assert.equal(derived.status, "chapter_review");
});

test("one chapter still to write keeps the project in chapter writing", () => {
  // The boundary between the two stages is "is there anything left to write",
  // not "has anything been handed in".
  const derived = deriveProjectStage({
    project: project(),
    chapters: chapters("approved", "approved", "approved", "approved", "draft"),
    proposal: submittedProposal,
    supervisorAssigned: true,
  });
  assert.equal(derived.stage, "Chapter writing");
});

test("a chapter sent back for revision counts as work still to do", () => {
  const derived = deriveProjectStage({
    project: project(),
    chapters: chapters("approved", "approved", "approved", "approved", "needs_revision"),
    proposal: submittedProposal,
    supervisorAssigned: true,
  });
  assert.equal(derived.stage, "Chapter writing");
});

test("every chapter approved moves the project to the defence", () => {
  const derived = deriveProjectStage({
    project: project(),
    chapters: ALL_APPROVED,
    proposal: submittedProposal,
    supervisorAssigned: true,
  });
  assert.equal(derived.stage, "Defense");
  assert.equal(derived.status, "defense");
});

test("the final submission outranks every other signal", () => {
  const derived = deriveProjectStage({
    project: project({ finalSubmittedAt: "2026-10-04T09:00:00.000Z" }),
    chapters: chapters("approved", "approved", "not_started", "not_started", "not_started"),
    proposal: submittedProposal,
  });
  assert.equal(derived.stage, "Final submission");
  assert.equal(derived.progress, 100);
});

test("the final submission still wins when the chapter list could not be read", () => {
  // Precedence has to hold against a degraded read, or a transient failure would
  // move a finished project backwards.
  const derived = deriveProjectStage({
    project: project({ finalSubmittedAt: "2026-10-04T09:00:00.000Z" }),
    chapters: [],
    proposal: null,
  });
  assert.equal(derived.stage, "Final submission");
});

test("rows without a chapter number are left out rather than counted", () => {
  const derived = deriveProjectStage({
    project: project(),
    chapters: [...ALL_APPROVED, { status: "not_started" }, null],
    proposal: submittedProposal,
  });
  assert.equal(derived.stage, "Defense");
});

test("an empty chapter list falls through to the assignment signal", () => {
  // A missing or unreadable chapter list must not invent a stage that says work
  // has begun. The server skips the write-back in this case; the derivation
  // itself still has to answer without throwing.
  const derived = deriveProjectStage({
    project: project(),
    chapters: [],
    proposal: submittedProposal,
    supervisorAssigned: true,
  });
  assert.equal(derived.stage, "Chapter writing");
});

test("isSubmittedProposal accepts the three handed-in statuses only", () => {
  for (const status of ["submitted", "under_review", "approved"]) {
    assert.equal(isSubmittedProposal({ status }), true, status);
  }
  for (const status of ["draft", "rejected", "", null, undefined]) {
    assert.equal(isSubmittedProposal({ status }), false, String(status));
  }
  assert.equal(isSubmittedProposal(null), false);
});

test("isSubmittedProposal tolerates the casing and spacing of a stored value", () => {
  assert.equal(isSubmittedProposal({ status: " Submitted " }), true);
  assert.equal(isSubmittedProposal({ status: "APPROVED" }), true);
});

test("readStageProgress reproduces the position it was derived from", () => {
  for (const [name, index] of Object.entries(PROJECT_STAGE_INDEX)) {
    if (index === PROJECT_STAGE_INDEX.finalSubmission) continue;
    const { currentIndex, currentStage } = readStageProgress(
      project({ progress: progressForStage(index) }),
    );
    assert.equal(currentIndex, index, name);
    assert.equal(currentStage, PROJECT_TIMELINE[index], name);
  }
});

test("readStageProgress treats a student with no project as not started", () => {
  const empty = readStageProgress(null);
  assert.equal(empty.progress, 0);
  assert.equal(empty.currentStage, null);
  assert.equal(empty.completedSteps, 0);
});

test("readStageProgress survives a progress value that is not a number", () => {
  assert.equal(readStageProgress(project({ progress: null })).progress, 0);
  assert.equal(readStageProgress(project({ progress: "not a number" })).progress, 0);
  assert.equal(readStageProgress(project({ progress: "34" })).currentIndex, 2);
});

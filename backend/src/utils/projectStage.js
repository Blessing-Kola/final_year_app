// Where a project is, worked out from the records rather than from a number
// somebody remembered to update.
//
// `projects.stage` and `projects.progress` used to be written by hand at two
// moments — the proposal and the final submission — so everything in between
// (chapter approvals, in particular) left them behind. The dashboard then showed
// a stage the data no longer supported. The server re-derives both from the
// project, its chapters, its proposal and its supervisor on every portal read
// and stores the result, which is why `deriveProjectStage` lives here beside the
// client that draws it: the two cannot drift apart if they share the constants.

// The six stages, in order. Every portal draws exactly this list, so they can
// never disagree about what the stages are or what they are called.
export const PROJECT_TIMELINE = [
  "Proposal",
  "Supervisor assigned",
  "Chapter writing",
  "Chapter review",
  "Defense",
  "Final submission",
];

// Machine keys, in timeline order. `stage` above is the label a person reads and
// is free to change; these are what code compares against.
const STATUS_BY_INDEX = [
  "proposal",
  "supervisor_assigned",
  "chapter_writing",
  "chapter_review",
  "defense",
  "final_submission",
];

// Named positions in the timeline, so callers name a stage instead of counting.
export const PROJECT_STAGE_INDEX = {
  proposal: 0,
  supervisorAssigned: 1,
  chapterWriting: 2,
  chapterReview: 3,
  defense: 4,
  finalSubmission: 5,
};

// Built from the two lists above rather than written out a second time, so a
// stage can never end up with one name in the index map and another in the status.
export const PROJECT_STATUS = Object.fromEntries(
  Object.entries(PROJECT_STAGE_INDEX).map(([name, index]) => [name, STATUS_BY_INDEX[index]]),
);

// A chapter in any of these has been handed in and is waiting on a supervisor.
const SUBMITTED_CHAPTER_STATUSES = new Set(["submitted", "under_review", "approved"]);

const SUBMITTED_PROPOSAL_STATUSES = new Set(["submitted", "under_review", "approved"]);

// A proposal the student has actually handed in, as opposed to one still in draft.
export const isSubmittedProposal = (proposal) =>
  Boolean(proposal) && SUBMITTED_PROPOSAL_STATUSES.has(String(proposal.status ?? "").trim().toLowerCase());

// Progress as a percentage of the whole timeline.
//
// It is a function of the stage rather than a separately tracked number, which is
// what makes it impossible for the bar to point at one stage and the label to name
// another. Each value sits inside its stage's own sixth of the bar, so the client
// recovers exactly the same index it was derived from.
//
// The last stage is the exception: a project whose final submission is in is
// finished, so it fills the bar and the timeline reads as complete.
export function progressForStage(index) {
  if (!Number.isFinite(index) || index < 0) return 0;
  if (index >= PROJECT_TIMELINE.length - 1) return 100;
  return Math.round((index * 100) / PROJECT_TIMELINE.length) + 1;
}

// The stage a project's records actually support.
//
// Read top to bottom: each branch is a later stage than the one below it, and the
// first one that holds wins. Returns null when there is no project to place.
export function deriveProjectStage({
  project,
  chapters = [],
  proposal = null,
  supervisorAssigned = false,
} = {}) {
  if (!project) return null;

  // Rows without a chapter number cannot be placed in the sequence, so they are
  // left out rather than counted as unwritten.
  const rows = Array.isArray(chapters)
    ? chapters.filter((chapter) => chapter && Number.isFinite(chapter.chapterNumber))
    : [];

  let index;

  if (project.finalSubmittedAt) {
    index = PROJECT_STAGE_INDEX.finalSubmission;
  } else if (rows.length && rows.every((chapter) => chapter.status === "approved")) {
    // Every chapter signed off. What is left is the defence and the write-up.
    index = PROJECT_STAGE_INDEX.defense;
  } else if (rows.length && rows.every((chapter) => SUBMITTED_CHAPTER_STATUSES.has(chapter.status))) {
    // Nothing left to write, but at least one chapter is still with a supervisor.
    index = PROJECT_STAGE_INDEX.chapterReview;
  } else if (supervisorAssigned || rows.some((chapter) => chapter.status !== "not_started")) {
    // Work is under way. A chapter that has been opened counts on its own, even
    // without a supervisor yet — the alternative would show a student who is
    // already writing an earlier stage than the one they are working in.
    index = PROJECT_STAGE_INDEX.chapterWriting;
  } else if (isSubmittedProposal(proposal)) {
    // Handed in, waiting on a supervisor and on Chapter 1 opening.
    index = PROJECT_STAGE_INDEX.supervisorAssigned;
  } else {
    index = PROJECT_STAGE_INDEX.proposal;
  }

  return {
    index,
    stage: PROJECT_TIMELINE[index],
    status: STATUS_BY_INDEX[index],
    progress: progressForStage(index),
  };
}

// The reverse of the above, for the client: reads a stored project back into the
// position the timeline draws. Kept here so the two conversions are read together.
export function readStageProgress(project) {
  const parsed = Number(project?.progress);
  const progress = Number.isFinite(parsed) ? parsed : 0;
  const stepSize = 100 / PROJECT_TIMELINE.length;
  const completedSteps = project ? Math.floor(progress / stepSize) : 0;
  const currentIndex =
    project && completedSteps < PROJECT_TIMELINE.length ? completedSteps : -1;
  const currentFill =
    currentIndex === -1
      ? 0
      : Math.min(
          100,
          Math.max(0, ((progress - completedSteps * stepSize) / stepSize) * 100),
        );

  return {
    progress,
    completedSteps,
    currentIndex,
    currentFill,
    currentStage: currentIndex === -1 ? null : PROJECT_TIMELINE[currentIndex],
    nextStage:
      currentIndex >= 0 && currentIndex + 1 < PROJECT_TIMELINE.length
        ? PROJECT_TIMELINE[currentIndex + 1]
        : null,
  };
}

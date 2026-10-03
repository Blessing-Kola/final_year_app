const hasValidId = (value) =>
  value !== null && value !== undefined && value !== "";

// `studentId` means two different things depending on the row. On a user record
// it is a matric number, which may legitimately be blank, so it must never gate
// the row — those rows are keyed by `id`. On project/meeting/review/defense rows
// it is a real foreign key and a blank one means the row is unusable.
const sanitizeByPrimaryKey = (items) =>
  Array.isArray(items)
    ? items.filter(
        (item) => item && typeof item === "object" && hasValidId(item.id),
      )
    : [];

const sanitizeByStudentForeignKey = (items) =>
  Array.isArray(items)
    ? items.filter(
        (item) =>
          item && typeof item === "object" && hasValidId(item.studentId),
      )
    : [];

export function sanitizePortalData(payload) {
  if (!payload || typeof payload !== "object") return payload;

  return {
    ...payload,
    students: sanitizeByPrimaryKey(payload.students),
    supervisors: sanitizeByPrimaryKey(payload.supervisors),
    projects: sanitizeByStudentForeignKey(payload.projects),
    reviews: sanitizeByStudentForeignKey(payload.reviews),
    meetings: sanitizeByStudentForeignKey(payload.meetings),
    defenses: sanitizeByStudentForeignKey(payload.defenses),
    topics: sanitizeByPrimaryKey(payload.topics),
    chapters: sanitizeByPrimaryKey(payload.chapters),
    messages: sanitizeByPrimaryKey(payload.messages),
    activities: sanitizeByPrimaryKey(payload.activities),
    stats:
      payload.stats && typeof payload.stats === "object" ? payload.stats : {},
    project:
      payload.project && typeof payload.project === "object"
        ? payload.project
        : null,
    supervisorRequest:
      payload.supervisorRequest && typeof payload.supervisorRequest === "object"
        ? payload.supervisorRequest
        : null,
  };
}

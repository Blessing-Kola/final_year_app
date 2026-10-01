import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePortalData } from "./sanitizePortalData.js";

test("keeps a student whose matric number is blank", () => {
  // Regression: user rows were gated on `studentId`, so a student who registered
  // without a matric number disappeared from the coordinator's user list.
  const data = sanitizePortalData({
    students: [
      { id: "u1", studentId: "", name: "No Matric" },
      { id: "u2", studentId: null, name: "Null Matric" },
      { id: "u3", studentId: "CSC/2021/001", name: "Has Matric" },
    ],
  });

  assert.deepEqual(
    data.students.map((student) => student.id),
    ["u1", "u2", "u3"],
  );
});

test("still drops user rows with no primary key", () => {
  const data = sanitizePortalData({
    students: [{ id: null, studentId: "CSC/2021/001" }, { id: "", name: "x" }],
    supervisors: [{ studentId: "STAFF-1" }, { id: "s2" }],
  });

  assert.deepEqual(data.students, []);
  assert.deepEqual(
    data.supervisors.map((supervisor) => supervisor.id),
    ["s2"],
  );
});

test("drops projects whose student foreign key is missing", () => {
  const data = sanitizePortalData({
    projects: [
      { id: "p1", studentId: "u1" },
      { id: "p2", studentId: "" },
      { id: "p3", studentId: null },
    ],
  });

  assert.deepEqual(
    data.projects.map((project) => project.id),
    ["p1"],
  );
});

test("applies the foreign-key rule to reviews, meetings and defenses", () => {
  const data = sanitizePortalData({
    reviews: [{ id: "r1", studentId: "" }],
    meetings: [{ id: "m1", studentId: "u1" }, { id: "m2", studentId: "" }],
    defenses: [{ id: "d1", studentId: null }],
  });

  assert.deepEqual(data.reviews, []);
  assert.deepEqual(
    data.meetings.map((meeting) => meeting.id),
    ["m1"],
  );
  assert.deepEqual(data.defenses, []);
});

test("coerces non-array collections to empty arrays", () => {
  const data = sanitizePortalData({
    students: { id: "not-an-array" },
    projects: null,
    chapters: undefined,
  });

  assert.deepEqual(data.students, []);
  assert.deepEqual(data.projects, []);
  assert.deepEqual(data.chapters, []);
});

test("keeps a project object and blanks a non-object one", () => {
  const project = { id: "p1", title: "Thesis" };
  assert.equal(sanitizePortalData({ project }).project, project);
  assert.equal(sanitizePortalData({ project: "oops" }).project, null);
  assert.equal(sanitizePortalData({}).project, null);
});

test("passes a non-object payload through untouched", () => {
  assert.equal(sanitizePortalData(null), null);
  assert.equal(sanitizePortalData(undefined), undefined);
  assert.equal(sanitizePortalData("nope"), "nope");
});

test("preserves unrelated keys and defaults stats", () => {
  const data = sanitizePortalData({ role: "student", stats: "bad" });

  assert.equal(data.role, "student");
  assert.deepEqual(data.stats, {});
});

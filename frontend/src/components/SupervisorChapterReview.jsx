import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Undo2 } from "lucide-react";
import { chapterApi } from "../services/api";
import { Feedback, StatusBadge } from "./StatusBadge";
import DocumentViewer from "./DocumentViewer";

// A chapter is only readable by the supervisor once the student has submitted it.
const READABLE_STATUSES = new Set(["submitted", "under_review", "approved"]);

const formatDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

// The assigned students come from the page, which has already loaded them, rather
// than fetching the whole portal payload a second time.
export default function SupervisorChapterReview({ students = [] }) {
  const [selectedId, setSelectedId] = useState("");
  const [chapters, setChapters] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [busy, setBusy] = useState("");

  // Falls back to the first assigned student rather than copying one into state,
  // so the list arriving later needs no effect to sync it.
  const studentId = selectedId || students[0]?.id || "";
  const loading = Boolean(studentId) && loadedFor !== studentId;

  useEffect(() => {
    if (!studentId) return undefined;

    let active = true;

    chapterApi
      .list(studentId)
      .then((response) => {
        if (!active) return;
        setChapters(response.chapters ?? []);
        setError("");
        setLoadedFor(studentId);
      })
      .catch((loadError) => {
        if (!active) return;
        setChapters([]);
        setError(loadError.message);
        setLoadedFor(studentId);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  const readable = chapters.filter((chapter) => READABLE_STATUSES.has(chapter.status));
  const activeChapter = chapters.find((chapter) => chapter.id === activeId) ?? readable[0] ?? null;

  const reload = async () => {
    const response = await chapterApi.list(studentId);
    setChapters(response.chapters ?? []);
  };

  // Returns whether the action went through, so a rejected review keeps the
  // comment the supervisor just typed instead of clearing it.
  const run = async (label, task) => {
    setBusy(label);
    setError("");
    setNotice("");

    try {
      const response = await task();
      await reload();
      setNotice(response?.message || "Chapter updated.");
      return true;
    } catch (taskError) {
      setError(taskError.message);
      return false;
    } finally {
      setBusy("");
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      setError("Write a comment before adding it");
      return;
    }
    if (await run("comment", () => chapterApi.addComment(activeChapter.id, comment))) setComment("");
  };

  const handleApprove = async () => {
    if (await run("approve", () => chapterApi.approve(activeChapter.id, comment))) setComment("");
  };

  const handleRequestRevision = async () => {
    if (!comment.trim()) {
      setError("Add a comment explaining what needs revising");
      return;
    }
    if (await run("revision", () => chapterApi.requestRevision(activeChapter.id, comment))) setComment("");
  };

  if (!students.length) {
    return (
      <Feedback tone="info">
        You have no assigned students yet, so there is nothing to review.
      </Feedback>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Chapter review</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Read the submitted chapter, leave comments, then approve it or ask for a revision.
          </p>
        </div>

        <label className="text-sm text-slate-600 dark:text-slate-300">
          <span className="mr-2">Student</span>
          <select
            value={studentId}
            onChange={(event) => {
              // Reset the review draft: it belongs to the chapter being left behind.
              setSelectedId(event.target.value);
              setActiveId("");
              setComment("");
              setError("");
              setNotice("");
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <Feedback tone="error">{error}</Feedback>
        <Feedback tone="success">{notice}</Feedback>
      </div>

      {loading ? (
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ) : null}

      {!loading && !readable.length ? (
        <p className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No chapters have been submitted for review yet.
        </p>
      ) : null}

      {!loading && readable.length ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {readable.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => {
                  setActiveId(chapter.id);
                  setComment("");
                  setError("");
                  setNotice("");
                }}
                aria-pressed={activeChapter?.id === chapter.id}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                  activeChapter?.id === chapter.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                Chapter {chapter.chapterNumber}
              </button>
            ))}
          </div>

          {activeChapter ? (
            <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{activeChapter.title}</p>
                  <StatusBadge status={activeChapter.status} />
                </div>

                {activeChapter.documentId ? (
                  <DocumentViewer
                    chapterId={activeChapter.id}
                    name={`chapter-${activeChapter.chapterNumber}`}
                  />
                ) : (
                  <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    No document was uploaded for this chapter.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <label
                    htmlFor="chapter-review-comment"
                    className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
                  >
                    Comment
                  </label>
                  <textarea
                    id="chapter-review-comment"
                    rows={5}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="What should the student change, or what is good about this chapter?"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />

                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={busy === "comment" || activeChapter.status === "approved"}
                    className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {busy === "comment" ? "Adding..." : "Add comment"}
                  </button>

                  {activeChapter.status === "approved" ? (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      This chapter is approved and closed for review.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleRequestRevision}
                        disabled={Boolean(busy)}
                        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Undo2 size={15} />
                        {busy === "revision" ? "Requesting..." : "Request revision"}
                      </button>
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={Boolean(busy)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 size={15} />
                        {busy === "approve" ? "Approving..." : "Approve chapter"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    Review history
                  </p>
                  {activeChapter.comments?.length ? (
                    <ul className="mt-3 space-y-2">
                      {activeChapter.comments.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <p>{entry.comment}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <FileText size={14} /> No comments on this chapter yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

import { useState } from "react";
import { CheckCircle2, Lock, UploadCloud } from "lucide-react";
import { chapterApi } from "../services/api";
import { Feedback, StatusBadge } from "./StatusBadge";
import { usePortalData } from "../hooks/usePortalData";

const CHECKLIST_ITEMS = [
  "All chapters approved",
  "Supervisor sign-off",
  "Title page included",
  "Declaration page included",
];

// The statuses where the student still has work to do on the chapter.
const EDITABLE_STATUSES = new Set(["not_started", "in_progress", "draft", "needs_revision"]);

const formatDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function ChapterCard({ chapter, busy, onUpload, onSubmit }) {
  const locked = !chapter.unlocked;
  const editable = !locked && EDITABLE_STATUSES.has(chapter.status);
  const waiting = chapter.status === "submitted" || chapter.status === "under_review";

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${
        locked
          ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className={`font-semibold ${locked ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}
          >
            {chapter.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {locked
              ? `Complete and receive approval for Chapter ${chapter.chapterNumber - 1} before Chapter ${chapter.chapterNumber} becomes available.`
              : editable
                ? "Upload your latest PDF or DOCX, then submit it for review."
                : waiting
                  ? "With your supervisor for review."
                  : "Approved by your supervisor."}
          </p>
        </div>
        <StatusBadge status={locked ? "locked" : chapter.status} />
      </div>

      {locked ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Lock size={14} /> Locked
        </p>
      ) : null}

      {editable ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <UploadCloud size={16} />
            {busy ? "Uploading..." : chapter.documentId ? "Replace document" : "Upload document"}
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(chapter, file);
                event.target.value = "";
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => onSubmit(chapter)}
            disabled={!chapter.documentId || busy}
            className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            Submit for review
          </button>

          {!chapter.documentId ? (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Upload a document to submit this chapter.
            </span>
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">Document ready to submit.</span>
          )}
        </div>
      ) : null}

      {waiting ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          Submitted {formatDate(chapter.submittedAt)} · awaiting review
        </p>
      ) : null}

      {chapter.status === "approved" ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 size={14} /> Approved {formatDate(chapter.reviewedAt)}
        </p>
      ) : null}

      <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Supervisor feedback
        </p>
        {chapter.comments?.length ? (
          <ul className="mt-3 space-y-2">
            {chapter.comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <p>{comment.comment}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(comment.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No supervisor feedback available yet.
          </p>
        )}
      </div>
    </article>
  );
}

export default function StudentChapters() {
  const { data, loading: portalLoading } = usePortalData();
  // A read taken after a mutation wins over the portal snapshot; null means the
  // portal copy is still authoritative. Derived rather than copied into state so
  // nothing has to be synced back with an effect.
  const [chaptersOverride, setChaptersOverride] = useState(null);
  const [finalSubmittedOverride, setFinalSubmittedOverride] = useState(undefined);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [checked, setChecked] = useState(() => CHECKLIST_ITEMS.map(() => false));
  const [submittingFinal, setSubmittingFinal] = useState(false);

  const chapters = chaptersOverride ?? data?.chapters ?? null;
  const finalSubmittedAt =
    finalSubmittedOverride !== undefined
      ? finalSubmittedOverride
      : (data?.project?.finalSubmittedAt ?? null);

  const refresh = async () => {
    const response = await chapterApi.list();
    setChaptersOverride(response.chapters ?? []);
  };

  const run = async (chapter, task) => {
    setBusyId(chapter.id);
    setError("");
    setNotice("");

    try {
      const response = await task();
      // Re-read rather than patching locally: review controls whether the next
      // chapter unlocks, and only the server can say that.
      await refresh();
      setNotice(response?.message || `Chapter ${chapter.chapterNumber} updated.`);
    } catch (taskError) {
      setError(taskError.message);
    } finally {
      setBusyId("");
    }
  };

  const handleUpload = (chapter, file) =>
    run(chapter, () => chapterApi.uploadDocument(chapter.id, file));

  const handleSubmit = (chapter) => run(chapter, () => chapterApi.submit(chapter.id));

  const handleFinalSubmit = async () => {
    setSubmittingFinal(true);
    setError("");
    setNotice("");

    try {
      const response = await chapterApi.submitFinal();
      setFinalSubmittedOverride(new Date().toISOString());
      setNotice(response?.message || "Final project submitted.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmittingFinal(false);
    }
  };

  if (portalLoading && chapters === null) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  const list = chapters ?? [];
  const allApproved = list.length > 0 && list.every((chapter) => chapter.status === "approved");
  const checklistComplete = checked.every(Boolean);
  const canSubmitFinal = allApproved && checklistComplete && !finalSubmittedAt;

  return (
    <div className="space-y-6">
      <Feedback tone="error">{error}</Feedback>
      <Feedback tone="success">{notice}</Feedback>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Chapters</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Chapters open one at a time. Each one unlocks once the chapter before it has been approved.
          </p>
        </div>

        {list.length ? (
          list.map((chapter) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              busy={busyId === chapter.id}
              onUpload={handleUpload}
              onSubmit={handleSubmit}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Your chapters appear here once your project has been created.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Final submission checklist
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every box must be ticked and every chapter approved before you can submit.
        </p>

        <div className="mt-4 space-y-3">
          {CHECKLIST_ITEMS.map((item, index) => (
            <label
              key={item}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
            >
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={(event) =>
                  setChecked((current) =>
                    current.map((value, position) => (position === index ? event.target.checked : value)),
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">{item}</span>
            </label>
          ))}
        </div>

        {!allApproved ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            All five chapters must be approved before the final project can be submitted.
          </p>
        ) : null}

        {finalSubmittedAt ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 size={15} /> Final project submitted on {formatDate(finalSubmittedAt)}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={!canSubmitFinal || submittingFinal}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            {submittingFinal ? "Submitting..." : "Submit final project"}
          </button>
        )}
      </section>
    </div>
  );
}

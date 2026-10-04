import { useEffect, useState } from "react";
import { Check, CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { checklistApi } from "../services/api";
import { Feedback } from "./StatusBadge";

// Shown when the list is empty, so a student is not staring at a blank panel with
// no idea what a defence checklist is for. Adding one is still just a suggestion.
const SUGGESTIONS = [
  "Finalise slides",
  "Print the report",
  "Rehearse the presentation",
  "Check the venue and time",
];

const progressOf = (items) => {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
};

// Private to the signed-in student: every request is scoped to the caller on the
// server, so this component never sends or receives another student's items.
export default function DefenceChecklist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    let active = true;

    checklistApi
      .list()
      .then((response) => {
        if (active) setItems(Array.isArray(response.items) ? response.items : []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Your checklist could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAdd = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    setError("");
    try {
      const response = await checklistApi.create({ title: trimmed });
      setItems((current) => [...current, response.item]);
      setTitle("");
    } catch (addError) {
      setError(addError.message || "That item could not be added.");
    } finally {
      setAdding(false);
    }
  };

  // Ticking a box is the most frequent action here, so it is applied to the list
  // immediately and rolled back if the server refuses.
  const toggle = async (item) => {
    const previous = items;
    const next = !item.done;

    setError("");
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, done: next, completedAt: next ? new Date().toISOString() : null } : entry,
      ),
    );

    try {
      const response = await checklistApi.update(item.id, { done: next });
      setItems((current) => current.map((entry) => (entry.id === item.id ? response.item : entry)));
    } catch (updateError) {
      setItems(previous);
      setError(updateError.message || "That item could not be updated.");
    }
  };

  const saveTitle = async (item) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setError("Give the checklist item a title.");
      return;
    }
    if (trimmed === item.title) {
      setEditingId(null);
      return;
    }

    setError("");
    try {
      const response = await checklistApi.update(item.id, { title: trimmed });
      setItems((current) => current.map((entry) => (entry.id === item.id ? response.item : entry)));
      setEditingId(null);
    } catch (updateError) {
      setError(updateError.message || "That item could not be renamed.");
    }
  };

  const remove = async (item) => {
    const previous = items;
    setError("");
    setItems((current) => current.filter((entry) => entry.id !== item.id));

    try {
      await checklistApi.remove(item.id);
    } catch (removeError) {
      setItems(previous);
      setError(removeError.message || "That item could not be removed.");
    }
  };

  const { total, done, percent } = progressOf(items);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Defence checklist</h2>
          <p className="text-sm text-slate-500">
            Private to you — your supervisor and the coordinator cannot see this.
          </p>
        </div>
        {total ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {done} of {total} complete
          </span>
        ) : null}
      </div>

      {total ? (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}

      <div className="mt-4">
        <Feedback tone="error">{error}</Feedback>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading your checklist…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
            >
              <button
                type="button"
                onClick={() => toggle(item)}
                aria-pressed={item.done}
                aria-label={item.done ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  item.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-transparent hover:border-indigo-400"
                }`}
              >
                <Check size={15} />
              </button>

              {editingId === item.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveTitle(item);
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => saveTitle(item)}
                    aria-label="Save item"
                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                  >
                    <CheckCircle2 size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel editing"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    <X size={17} />
                  </button>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      item.done ? "text-slate-400 line-through" : "text-slate-900"
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.notes ? (
                    <p className="mt-0.5 text-sm text-slate-500">{item.notes}</p>
                  ) : null}
                </div>
              )}

              {editingId === item.id ? null : (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingTitle(item.title);
                    }}
                    aria-label={`Rename "${item.title}"`}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    aria-label={`Remove "${item.title}"`}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && !items.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">
            Nothing on your checklist yet. Add your own, or start with one of these:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={async () => {
                  setError("");
                  try {
                    const response = await checklistApi.create({ title: suggestion });
                    setItems((current) => [...current, response.item]);
                  } catch (addError) {
                    setError(addError.message || "That item could not be added.");
                  }
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a preparation item…"
          maxLength={200}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={adding || !title.trim()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={16} />
          {adding ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { messageApi } from "../services/api";
import { Feedback } from "./StatusBadge";
import { isUnread } from "../utils/messages.js";

// How often an open thread re-checks for the other person's reply. Polling
// rather than a socket: the API is a plain Express app with no realtime channel,
// and 15s is quick enough to feel live without adding infrastructure.
const REFRESH_INTERVAL = 15 * 1000;

const formatSentAt = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Switching partners is handled by remounting with a `key` rather than by
// resetting state in an effect, so the previous thread's messages, draft and
// errors are dropped in one step. Callers that let the partner change must pass
// `key={partnerId}`.
export default function MessageThread({
  partnerId,
  partnerName,
  partnerSubtitle,
  currentUserId,
  emptyHint = "No messages yet. Say hello.",
  onConversationChange,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  // Held in a ref so a caller passing an inline arrow does not change `load`'s
  // identity and restart the polling interval on every render.
  const notifyRef = useRef(onConversationChange);
  useEffect(() => {
    notifyRef.current = onConversationChange;
  }, [onConversationChange]);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!partnerId) return;

      try {
        const response = await messageApi.list(partnerId);
        let rows = Array.isArray(response.messages) ? response.messages : [];
        setMessages(rows);
        setError("");

        const unread = rows.filter((message) => isUnread(message, currentUserId));
        if (unread.length) {
          // Clear the unread state server-side, then mirror it locally so the next
          // poll does not briefly show the thread as unread again.
          const markedAt = await messageApi
            .markRead(partnerId)
            .then((payload) => payload?.readAt ?? new Date().toISOString())
            .catch(() => null);

          if (markedAt) {
            rows = rows.map((message) =>
              isUnread(message, currentUserId) ? { ...message, readAt: markedAt } : message,
            );
            setMessages(rows);
          }
        }

        // The portal payload a parent uses for its conversation list is fetched
        // once and never again, so hand back the fresher rows — otherwise an
        // unread badge lit from that snapshot can never clear.
        notifyRef.current?.(partnerId, rows);
      } catch (loadError) {
        if (!quiet) setError(loadError.message || "Unable to load this conversation.");
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [partnerId, currentUserId],
  );

  useEffect(() => {
    if (!partnerId) return undefined;

    const initialLoadId = window.setTimeout(() => load(), 0);
    const intervalId = window.setInterval(() => load({ quiet: true }), REFRESH_INTERVAL);

    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [partnerId, load]);

  // Keep the newest message in view as the thread grows. Scrolling the list
  // element directly rather than scrollIntoView on a sentinel, which would also
  // drag the whole page down on every poll.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const handleSend = async (event) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text || sending) return;

    // Show it immediately; a failed send rolls the bubble back and restores the
    // draft rather than silently losing what was typed.
    const placeholder = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: currentUserId,
      recipientId: partnerId,
      body: text,
      createdAt: new Date().toISOString(),
      readAt: null,
      pending: true,
    };

    setMessages((current) => [...current, placeholder]);
    setDraft("");
    setSending(true);
    setError("");

    try {
      const response = await messageApi.send({ recipientId: partnerId, body: text });
      setMessages((current) =>
        current.map((message) => (message.id === placeholder.id ? response.message : message)),
      );
      // Keep the caller's conversation list preview in step with the send.
      notifyRef.current?.(partnerId, [...messages, response.message]);
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== placeholder.id));
      setDraft(text);
      setError(sendError.message || "Your message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  if (!partnerId) {
    return <Feedback tone="info">{emptyHint}</Feedback>;
  }

  // The sent-message bubble that a "Seen" marker would sit under.
  const lastOwnIndex = messages.reduce(
    (latest, message, index) => (message.senderId === currentUserId ? index : latest),
    -1,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="border-b border-slate-200 pb-3">
        <h2 className="font-semibold text-slate-900">{partnerName || "Conversation"}</h2>
        <p className="text-sm text-slate-500">{partnerSubtitle || ""}</p>
      </div>

      {error ? (
        <div className="mt-3">
          <Feedback>{error}</Feedback>
        </div>
      ) : null}

      <div ref={listRef} className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
        {loading ? <p className="text-sm text-slate-500">Loading messages...</p> : null}

        {messages.map((message, index) => {
          const mine = message.senderId === currentUserId;

          return (
            <div key={message.id} className="space-y-1">
              <div
                className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                  mine ? "ml-auto bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                } ${message.pending ? "opacity-70" : ""}`}
              >
                <p className="whitespace-pre-line break-words">{message.body}</p>
                <p className={`mt-1 text-xs ${mine ? "text-indigo-100" : "text-slate-400"}`}>
                  {message.pending ? "Sending..." : formatSentAt(message.createdAt)}
                </p>
              </div>

              {index === lastOwnIndex && message.readAt ? (
                <p className="text-right text-xs text-slate-400">Seen</p>
              ) : null}
            </div>
          );
        })}

        {!loading && !messages.length ? (
          <p className="text-sm text-slate-500">{emptyHint}</p>
        ) : null}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex items-end gap-2 rounded-2xl border border-slate-200 p-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message"
          aria-label="Write a message"
          className="min-h-[80px] flex-1 resize-none border-0 outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          <Send size={15} />
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}

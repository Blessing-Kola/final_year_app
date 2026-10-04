// A supervisor's portal payload carries every conversation they have at once, so
// "which messages belong to which thread" has to be answered the same way on the
// server and in both portals. These helpers are that single answer.

const timestamp = (value) => {
  const parsed = new Date(value ?? 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const byCreatedAtAscending = (a, b) => timestamp(a.createdAt) - timestamp(b.createdAt);

// Rows without an id are unusable, and the same row can arrive twice when the
// server stitches its "sent" and "received" reads together.
const dedupeById = (messages) => {
  const seen = new Set();

  return messages.filter((message) => {
    if (!message || typeof message !== "object" || !message.id) return false;
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
};

// Oldest first, which is the order a conversation is read in. The server loads a
// thread as two queries (sent and received); this stitches them into one list.
export function mergeConversation(sent = [], received = []) {
  const rows = [
    ...(Array.isArray(sent) ? sent : []),
    ...(Array.isArray(received) ? received : []),
  ];

  return dedupeById(rows).sort(byCreatedAtAscending);
}

// Newest message exchanged with one partner, for the conversation-list preview.
export function lastMessageWith(messages, partnerId) {
  if (!Array.isArray(messages) || !partnerId) return null;

  let latest = null;

  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    if (message.senderId !== partnerId && message.recipientId !== partnerId) continue;
    if (!latest || timestamp(message.createdAt) >= timestamp(latest.createdAt)) {
      latest = message;
    }
  }

  return latest;
}

// Inbound and not yet marked read. Own messages are never unread to their sender.
export function isUnread(message, currentUserId) {
  return Boolean(
    message &&
      typeof message === "object" &&
      message.recipientId === currentUserId &&
      !message.readAt,
  );
}

export function hasUnreadFrom(messages, currentUserId, partnerId) {
  if (!Array.isArray(messages) || !partnerId) return false;

  return messages.some(
    (message) =>
      isUnread(message, currentUserId) && message.senderId === partnerId,
  );
}

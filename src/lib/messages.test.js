import test from "node:test";
import assert from "node:assert/strict";
import {
  hasUnreadFrom,
  isUnread,
  lastMessageWith,
  mergeConversation,
} from "./messages.js";

const at = (minute) => `2026-10-04T10:${String(minute).padStart(2, "0")}:00.000Z`;

test("merges sent and received into one oldest-first conversation", () => {
  const merged = mergeConversation(
    [{ id: "b", createdAt: at(2) }, { id: "d", createdAt: at(4) }],
    [{ id: "a", createdAt: at(1) }, { id: "c", createdAt: at(3) }],
  );

  assert.deepEqual(
    merged.map((message) => message.id),
    ["a", "b", "c", "d"],
  );
});

test("drops a row that arrives in both halves rather than showing it twice", () => {
  // The same row can surface in both queries if a caller is ever both sender and
  // recipient; the thread must not render it twice.
  const shared = { id: "dup", createdAt: at(1) };
  const merged = mergeConversation([shared], [shared]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "dup");
});

test("drops rows with no id and tolerates missing or non-array input", () => {
  assert.deepEqual(mergeConversation([{ createdAt: at(1) }], []), []);
  assert.deepEqual(mergeConversation(undefined, undefined), []);
  assert.deepEqual(mergeConversation(null, "nope"), []);
});

test("orders rows with an unusable createdAt without throwing", () => {
  const merged = mergeConversation(
    [{ id: "bad", createdAt: "not-a-date" }],
    [{ id: "good", createdAt: at(1) }],
  );

  assert.deepEqual(
    merged.map((message) => message.id),
    ["bad", "good"],
  );
});

test("lastMessageWith returns the newest message for that partner only", () => {
  const messages = [
    { id: "1", senderId: "student", recipientId: "sup", createdAt: at(1) },
    { id: "2", senderId: "other", recipientId: "sup", createdAt: at(5) },
    { id: "3", senderId: "sup", recipientId: "student", createdAt: at(3) },
  ];

  // "other" is the newest overall but belongs to a different thread.
  assert.equal(lastMessageWith(messages, "student").id, "3");
});

test("lastMessageWith returns null when there is nothing to preview", () => {
  assert.equal(lastMessageWith([], "student"), null);
  assert.equal(lastMessageWith(undefined, "student"), null);
  assert.equal(lastMessageWith([{ id: "1", senderId: "a", recipientId: "b" }], ""), null);
});

test("isUnread is true only for inbound messages with no readAt", () => {
  assert.equal(isUnread({ recipientId: "me", readAt: null }, "me"), true);
  assert.equal(isUnread({ recipientId: "me", readAt: at(1) }, "me"), false);
  assert.equal(isUnread({ recipientId: "them", readAt: null }, "me"), false);
  assert.equal(isUnread(null, "me"), false);
});

test("hasUnreadFrom ignores reads and the caller's own messages", () => {
  const messages = [
    // Already read: must not light up the unread badge.
    { id: "1", senderId: "student", recipientId: "sup", readAt: at(2) },
    // Inbound and unread: the case the badge exists for.
    { id: "2", senderId: "student", recipientId: "sup", readAt: null },
    // Written by the supervisor, so never unread to them.
    { id: "3", senderId: "sup", recipientId: "student", readAt: null },
  ];

  assert.equal(hasUnreadFrom(messages, "sup", "student"), true);
  assert.equal(hasUnreadFrom([messages[0]], "sup", "student"), false);
  assert.equal(hasUnreadFrom([messages[2]], "sup", "student"), false);
  assert.equal(hasUnreadFrom(messages, "sup", ""), false);
});

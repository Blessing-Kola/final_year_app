import { createClient } from "@supabase/supabase-js";

// A relative base keeps requests same-origin: Vite proxies "/api" to Express in
// dev, and Express serves the built client itself in production. Pointing this
// at an absolute http://localhost:5000 makes every call cross-origin, which
// means a preflight on each one and a hard failure if any response is missing
// an Access-Control-Allow-Origin header.
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
let storageClient;

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function getAuthHeaders(extraHeaders = {}) {
  const token = window.localStorage.getItem("thesishub-token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  return handleResponse(response);
}

async function uploadDocument(file, uploadUrl, finalizeUrl) {
  if (!(file instanceof File)) {
    throw new Error("Choose a file to upload.");
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase Storage is not configured for file uploads.");
  }

  const { upload } = await request(uploadUrl, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });

  storageClient ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await storageClient.storage
    .from(upload.bucket)
    .uploadToSignedUrl(upload.path, upload.storageToken, file, {
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw new Error(error.message);

  return request(finalizeUrl, {
    method: "POST",
    body: JSON.stringify({ ticket: upload.ticket }),
  });
}

export const authApi = {
  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
};

export const documentsApi = {
  list: () => request("/documents"),
  upload: (file) =>
    uploadDocument(file, "/documents/upload-url", "/documents/finalize"),
  download: async (documentId) => {
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}/download`,
      {
        credentials: "include",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Download failed");
    }

    return response.blob();
  },
};

export const activitiesApi = {
  list: () => request("/activities"),
};

export const portalApi = {
  data: () => request("/portal/data"),
};

export const supervisorApi = {
  getRequest: () => request("/supervisor-requests"),
  request: (message) =>
    request("/supervisor-requests", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  listSupervisors: () => request("/users?role=supervisor"),
  assign: (requestId, supervisorId) =>
    request(`/supervisor-requests/${requestId}/assign`, {
      method: "POST",
      body: JSON.stringify({ supervisorId }),
    }),
};

export const topicApi = {
  get: () => request("/student-topics"),
  list: () => request("/student-topics"),
  submit: (title) =>
    request("/student-topics", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  accept: (topicId) =>
    request(`/student-topics/${topicId}/accept`, { method: "POST" }),
  decline: (topicId, reason) =>
    request(`/student-topics/${topicId}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

export const proposalApi = {
  get: () => request("/proposals"),
  list: () => request("/proposals"),
  submit: (payload) =>
    request("/proposals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const meetingApi = {
  // Student
  createMeetingRequest: (payload) =>
    request("/meeting-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMyMeetingRequests: () => request("/meeting-requests"),
  cancelMeetingRequest: (requestId) =>
    request(`/meeting-requests/${requestId}/cancel`, { method: "POST" }),
  // Supervisor — the same collection, scoped to the caller's role on the server.
  getMeetingRequests: () => request("/meeting-requests"),
  acceptMeetingRequest: (requestId, responseMessage) =>
    request(`/meeting-requests/${requestId}/accept`, {
      method: "POST",
      body: JSON.stringify({ responseMessage }),
    }),
  declineMeetingRequest: (requestId, reason) =>
    request(`/meeting-requests/${requestId}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

export const messageApi = {
  // The server works out which counterpart the caller is allowed to reach, so
  // the id here is only ever a hint about which thread to open.
  list: (withUserId) => request(`/messages?with=${encodeURIComponent(withUserId)}`),
  send: (payload) =>
    request("/messages", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  markRead: (withUserId) =>
    request("/messages/read", {
      method: "POST",
      body: JSON.stringify({ with: withUserId }),
    }),
};

export const chapterApi = {
  // Students get their own chapters; supervisors pass the student they are reviewing.
  list: (studentId) =>
    request(studentId ? `/chapters?studentId=${encodeURIComponent(studentId)}` : "/chapters"),
  uploadDocument: (chapterId, file) =>
    uploadDocument(
      file,
      `/chapters/${chapterId}/document/upload-url`,
      `/chapters/${chapterId}/document/finalize`,
    ),
  submit: (chapterId) => request(`/chapters/${chapterId}/submit`, { method: "POST" }),
  addComment: (chapterId, comment) =>
    request(`/chapters/${chapterId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  approve: (chapterId, comments) =>
    request(`/chapters/${chapterId}/approve`, {
      method: "POST",
      body: JSON.stringify({ comments }),
    }),
  requestRevision: (chapterId, comments) =>
    request(`/chapters/${chapterId}/request-revision`, {
      method: "POST",
      body: JSON.stringify({ comments }),
    }),
  submitFinal: () => request("/final-submission", { method: "POST" }),
  // The document needs the auth header, so it can't be a plain <a href>. The viewer
  // fetches this itself and turns the response into an object URL.
  documentUrl: (chapterId) => `${API_BASE_URL}/chapters/${chapterId}/document`,
  authHeaders: () => getAuthHeaders(),
};

export const defenceApi = {
  getSchedule: () => request("/defence-schedule"),
  saveSchedule: (payload) =>
    request("/defence-schedule", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // The server decides what the caller may see: a coordinator gets every result, a
  // supervisor only their assigned students, and a student only their own row —
  // and only once it has been published.
  listResults: () => request("/defence-results"),
  submitSupervisorScore: (studentId, payload) =>
    request(`/defence-results/${studentId}/supervisor-score`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  recordDefenceScore: (studentId, defenceScore) =>
    request(`/defence-results/${studentId}/defence-score`, {
      method: "POST",
      body: JSON.stringify({ defenceScore }),
    }),
  publishResult: (studentId) =>
    request(`/defence-results/${studentId}/publish`, { method: "POST" }),
  audit: (studentId) => request(`/defence-results/${studentId}/audit`),
};

export const checklistApi = {
  // Every checklist route is scoped to the caller on the server, so no student id
  // is ever sent from here.
  list: () => request("/checklist"),
  create: (payload) =>
    request("/checklist", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (itemId, changes) =>
    request(`/checklist/${itemId}`, {
      method: "POST",
      body: JSON.stringify(changes),
    }),
  remove: (itemId) => request(`/checklist/${itemId}/delete`, { method: "POST" }),
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
  upload: async (formData) => {
    const token = window.localStorage.getItem("thesishub-token");
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return handleResponse(response);
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
  listRequests: () => request("/supervisor-requests"),
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

export const chapterApi = {
  // Students get their own chapters; supervisors pass the student they are reviewing.
  list: (studentId) =>
    request(studentId ? `/chapters?studentId=${encodeURIComponent(studentId)}` : "/chapters"),
  uploadDocument: async (chapterId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = window.localStorage.getItem("thesishub-token");
    const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/document`, {
      method: "POST",
      credentials: "include",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return handleResponse(response);
  },
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

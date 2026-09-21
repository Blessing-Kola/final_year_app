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

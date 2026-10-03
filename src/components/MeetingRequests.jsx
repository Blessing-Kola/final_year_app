import { useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin, Plus, Video } from "lucide-react";
import { Feedback, StatusBadge } from "./StatusBadge";
import { meetingApi } from "../services/api";

const MODE_LABELS = { "in-person": "In-person", online: "Online" };

const formatMeetingDate = (value) => {
  if (!value) return "Not set";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatMeetingTime = (value) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!match) return value || "Not set";
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
};

const meetingWhen = (request) =>
  `${formatMeetingDate(request?.date)} at ${formatMeetingTime(request?.time)}`;

function MeetingRequestCard({ request, student, children }) {
  const online = request.mode === "online";

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{request.title}</p>
          {student ? (
            <p className="text-sm text-slate-500">
              {student.name || "Student"}
              {student.studentId ? ` • ${student.studentId}` : ""}
            </p>
          ) : null}
        </div>
        <StatusBadge status={request.status} fallback="Pending" />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <CalendarDays size={15} /> {formatMeetingDate(request.date)}
        </span>
        <span className="flex items-center gap-2">
          <Clock size={15} /> {formatMeetingTime(request.time)}
        </span>
        <span className="flex items-center gap-2">
          {online ? <Video size={15} /> : <MapPin size={15} />}
          {MODE_LABELS[request.mode] || request.mode || "Mode not set"}
        </span>
      </div>

      {request.location ? (
        <p className="mt-2 break-words text-sm text-slate-600">
          {online ? "Meeting link" : "Location"}: {request.location}
        </p>
      ) : null}

      {request.message ? (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <p className="font-medium text-slate-700">Agenda</p>
          <p className="mt-1 whitespace-pre-line">{request.message}</p>
        </div>
      ) : null}

      {request.responseMessage ? (
        <div
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${
            request.status === "declined"
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          <p className="font-medium">
            {request.status === "declined"
              ? "Reason for declining"
              : "Supervisor response"}
          </p>
          <p className="mt-1 whitespace-pre-line">{request.responseMessage}</p>
        </div>
      ) : null}

      {request.status === "accepted" ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Confirmed for {meetingWhen(request)}
          {request.location ? ` • ${request.location}` : ""}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-slate-400">
        Requested{" "}
        {request.createdAt
          ? new Date(request.createdAt).toLocaleDateString()
          : "recently"}
      </p>

      {children ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

const EMPTY_FORM = {
  title: "",
  date: "",
  time: "",
  mode: "in-person",
  location: "",
  message: "",
};

function MeetingRequestForm({
  supervisorName,
  onSubmit,
  onCancel,
  submitting,
  error,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [validationError, setValidationError] = useState("");

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setValidationError("Enter a meeting title or reason.");
      return;
    }
    if (!form.date) {
      setValidationError("Choose a preferred date.");
      return;
    }
    if (!form.time) {
      setValidationError("Choose a preferred time.");
      return;
    }

    setValidationError("");
    onSubmit({
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      mode: form.mode,
      location: form.location.trim(),
      message: form.message.trim(),
    });
  };

  const message = validationError || error;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5"
    >
      <h3 className="font-semibold text-slate-900">Request a meeting</h3>
      <p className="mt-1 text-sm text-slate-500">
        {supervisorName
          ? `This request goes to ${supervisorName}.`
          : "This request goes to your assigned supervisor."}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="meeting-title"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Meeting title / reason *
          </label>
          <input
            id="meeting-title"
            value={form.title}
            onChange={update("title")}
            placeholder="Project discussion"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="meeting-date"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Preferred date *
          </label>
          <input
            id="meeting-date"
            type="date"
            value={form.date}
            onChange={update("date")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="meeting-time"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Preferred time *
          </label>
          <input
            id="meeting-time"
            type="time"
            value={form.time}
            onChange={update("time")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="meeting-mode"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Meeting mode *
          </label>
          <select
            id="meeting-mode"
            value={form.mode}
            onChange={update("mode")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="in-person">In-person</option>
            <option value="online">Online</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="meeting-location"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            {form.mode === "online" ? "Meeting link" : "Location"}
          </label>
          <input
            id="meeting-location"
            value={form.location}
            onChange={update("location")}
            placeholder={form.mode === "online" ? "https://..." : "Room / building"}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="meeting-message"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Message / agenda
          </label>
          <textarea
            id="meeting-message"
            value={form.message}
            onChange={update("message")}
            placeholder="What would you like to discuss?"
            className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      {message ? (
        <div className="mt-3">
          <Feedback>{message}</Feedback>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Request meeting"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function StudentMeetingRequests({ supervisor }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let active = true;

    meetingApi
      .getMyMeetingRequests()
      .then((response) => {
        if (!active) return;
        setRequests(response.meetingRequests ?? []);
        setError("");
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.message || "Unable to load your meeting requests.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setFormError("");
    setNotice("");

    try {
      const response = await meetingApi.createMeetingRequest(values);
      setRequests((current) => [response.meetingRequest, ...current]);
      setFormOpen(false);
      setNotice("Your meeting request was sent to your supervisor.");
    } catch (submitError) {
      setFormError(submitError.message || "Unable to send your meeting request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    setBusyId(requestId);
    setError("");
    setNotice("");

    try {
      const response = await meetingApi.cancelMeetingRequest(requestId);
      const updated = response.meetingRequest;
      setRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice("Meeting request cancelled.");
    } catch (cancelError) {
      setError(cancelError.message || "Unable to cancel that meeting request.");
    } finally {
      setBusyId(null);
    }
  };

  if (!supervisor) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Meeting requests
        </h2>
        <div className="mt-4">
          <Feedback tone="info">
            You must have an assigned supervisor before requesting a meeting.
          </Feedback>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Meeting requests
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your supervisor is {supervisor.name}.
            </p>
          </div>
          {!formOpen ? (
            <button
              type="button"
              onClick={() => {
                setFormOpen(true);
                setFormError("");
                setNotice("");
              }}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              <Plus size={15} /> Request meeting
            </button>
          ) : null}
        </div>

        {formOpen ? (
          <div className="mt-4">
            <MeetingRequestForm
              supervisorName={supervisor.name}
              submitting={submitting}
              error={formError}
              onCancel={() => {
                setFormOpen(false);
                setFormError("");
              }}
              onSubmit={handleSubmit}
            />
          </div>
        ) : null}

        {notice ? (
          <div className="mt-4">
            <Feedback tone="success">{notice}</Feedback>
          </div>
        ) : null}
        {error ? (
          <div className="mt-4">
            <Feedback>{error}</Feedback>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          My meeting requests
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">
            Loading your meeting requests...
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {requests.map((request) => (
            <MeetingRequestCard key={request.id} request={request}>
              {request.status === "pending" ? (
                <button
                  type="button"
                  onClick={() => handleCancel(request.id)}
                  disabled={busyId === request.id}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
                >
                  {busyId === request.id ? "Cancelling..." : "Cancel request"}
                </button>
              ) : null}
            </MeetingRequestCard>
          ))}

          {!loading && !requests.length ? (
            <p className="rounded-xl border border-slate-200 p-5 text-sm text-slate-500">
              You have not requested any meetings yet.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SupervisorMeetingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [response, setResponse] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let active = true;

    meetingApi
      .getMeetingRequests()
      .then((payload) => {
        if (!active) return;
        setRequests(payload.meetingRequests ?? []);
        setError("");
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || "Unable to load meeting requests.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openResponse = (requestId, action) => {
    setResponse({ requestId, action });
    setResponseText("");
    setError("");
    setNotice("");
  };

  const closeResponse = () => {
    setResponse(null);
    setResponseText("");
  };

  const handleRespond = async (requestId, action) => {
    setBusyId(requestId);
    setError("");
    setNotice("");

    try {
      const payload =
        action === "accept"
          ? await meetingApi.acceptMeetingRequest(requestId, responseText.trim())
          : await meetingApi.declineMeetingRequest(requestId, responseText.trim());

      const updated = payload.meetingRequest;
      setRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        action === "accept"
          ? "Meeting request accepted."
          : "Meeting request declined.",
      );
      closeResponse();
    } catch (responseError) {
      setError(
        responseError.message || "Unable to respond to that meeting request.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.filter((request) => request.status === "pending");
  const history = requests.filter((request) => request.status !== "pending");

  const renderResponseControls = (request) => {
    const open = response?.requestId === request.id;

    if (!open) {
      return (
        <>
          <button
            type="button"
            onClick={() => openResponse(request.id, "accept")}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => openResponse(request.id, "decline")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
          >
            Decline
          </button>
        </>
      );
    }

    const declining = response.action === "decline";
    const busy = busyId === request.id;

    return (
      <div className="w-full">
        <label
          htmlFor={`meeting-response-${request.id}`}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {declining ? "Reason for declining" : "Confirmation message (optional)"}
        </label>
        <textarea
          id={`meeting-response-${request.id}`}
          value={responseText}
          onChange={(event) => setResponseText(event.target.value)}
          placeholder={
            declining ? "Please choose another time." : "See you then."
          }
          className="min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleRespond(request.id, response.action)}
            disabled={busy}
            className={`rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              declining ? "bg-red-600" : "bg-indigo-600"
            }`}
          >
            {busy
              ? "Saving..."
              : declining
                ? "Decline request"
                : "Confirm accept"}
          </button>
          <button
            type="button"
            onClick={closeResponse}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      {error ? <Feedback>{error}</Feedback> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Pending requests
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Meeting requests from students assigned to you.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">
            Loading meeting requests...
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {pending.map((request) => (
            <MeetingRequestCard
              key={request.id}
              request={request}
              student={request.student}
            >
              {renderResponseControls(request)}
            </MeetingRequestCard>
          ))}

          {!loading && !pending.length ? (
            <p className="rounded-xl border border-slate-200 p-5 text-sm text-slate-500">
              No pending meeting requests.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Meeting history</h2>
        <div className="mt-4 space-y-3">
          {history.map((request) => (
            <MeetingRequestCard
              key={request.id}
              request={request}
              student={request.student}
            />
          ))}

          {!loading && !history.length ? (
            <p className="rounded-xl border border-slate-200 p-5 text-sm text-slate-500">
              No meeting requests have been answered yet.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

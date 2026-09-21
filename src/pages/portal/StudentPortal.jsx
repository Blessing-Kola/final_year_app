import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  MessageSquare,
  CalendarDays,
  ArrowRight,
  UploadCloud,
  BellRing,
} from "lucide-react";
import { activitiesApi, documentsApi, supervisorApi } from "../../services/api";
import { usePortalData } from "../../hooks/usePortalData";
import { useAuth } from "../../context/useAuth";

const timeline = [
  "Proposal",
  "Supervisor assigned",
  "Chapter writing",
  "Chapter review",
  "Defense",
  "Final submission",
];

export function StudentDashboard() {
  const [activities, setActivities] = useState([]);
  const [supervisorRequest, setSupervisorRequest] = useState(null);
  const { data } = usePortalData();
  const project = data?.project;
  const chapters = data?.chapters ?? [];
  const metrics = [
    { label: "Project stage", value: project?.stage || "Not started" },
    {
      label: "Chapters submitted",
      value: `${chapters.filter((chapter) => chapter.status === "submitted").length} / ${chapters.length}`,
    },
    { label: "Deadline", value: project?.deadline || "Not set" },
    { label: "Overall grade", value: project?.grade || "Not released" },
  ];

  useEffect(() => {
    activitiesApi
      .list()
      .then((response) => setActivities(response.activities ?? []))
      .catch(() => setActivities([]));

    supervisorApi
      .getRequest()
      .then((response) => setSupervisorRequest(response.request ?? null))
      .catch(() => setSupervisorRequest(null));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-600 p-2 text-white">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                {project ? `Continue ${project.title}` : "Set up your project"}
              </h2>
              <p className="text-sm text-slate-600">
                {project?.stage || "Choose a topic to begin your project."}
              </p>
            </div>
          </div>
          <Link
            to={
              project ? "/app/student/documents/upload" : "/app/student/project"
            }
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Upload now <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Project timeline
              </h2>
              <p className="text-sm text-slate-500">
                {project ? `${project.progress}% complete` : "No project yet"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {timeline.map((step, index) => {
                const completed = project
                  ? index <
                    Math.floor((project.progress / 100) * timeline.length)
                  : false;
                const active = Boolean(project) && !completed && index === 0;
                return (
                  <div
                    key={step}
                    className="flex min-w-[120px] flex-1 flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 text-center"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${completed ? "bg-indigo-600 text-white" : active ? "border-2 border-indigo-600 bg-white text-indigo-600" : "bg-slate-100 text-slate-500"}`}
                    >
                      {completed ? <CheckCircle2 size={18} /> : index + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent notifications
              </h2>
              <Link
                to="/app/student/communication"
                className="text-sm font-medium text-indigo-600"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {activities.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div
                    className={`mt-0.5 rounded-lg p-2 ${item.tone === "indigo" ? "bg-indigo-50 text-indigo-600" : item.tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                  >
                    <BellRing size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.body}</p>
                  </div>
                </div>
              ))}
              {!activities.length ? (
                <p className="text-sm text-slate-500">No activities yet.</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
              {supervisorRequest?.supervisor?.name
                ?.split(" ")
                .map((value) => value[0])
                .join("")
                .slice(0, 2) || "--"}
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                {supervisorRequest?.supervisor?.name || "Supervisor assignment"}
              </h2>
              <p className="text-sm text-slate-500">
                {supervisorRequest?.supervisor?.department ||
                  (supervisorRequest
                    ? "Awaiting coordinator assignment"
                    : "No request submitted")}
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} />
              {supervisorRequest
                ? supervisorRequest.status === "assigned"
                  ? "Your supervisor is assigned"
                  : "Your request is with the coordinator"
                : "Request a supervisor for your project"}
            </div>
            {supervisorRequest?.supervisor ? (
              <div className="flex items-center gap-2">
                <CalendarDays size={15} /> Supervisor contact will appear here
              </div>
            ) : null}
          </div>
          <Link
            to="/app/student/project"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
          >
            {supervisorRequest ? "View request" : "Request supervisor"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function StudentProjectPage() {
  const [supervisorRequest, setSupervisorRequest] = useState(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestingSupervisor, setRequestingSupervisor] = useState(false);
  const [requestError, setRequestError] = useState("");
  const { data } = usePortalData();

  useEffect(() => {
    supervisorApi
      .getRequest()
      .then((response) => setSupervisorRequest(response.request ?? null))
      .catch(() => setSupervisorRequest(null));
  }, []);

  const handleSupervisorRequest = async () => {
    setRequestingSupervisor(true);
    setRequestError("");
    try {
      const response = await supervisorApi.request(requestMessage);
      setSupervisorRequest(response.request);
      setRequestMessage("");
    } catch (error) {
      setRequestError(error.message || "Unable to submit supervisor request.");
    } finally {
      setRequestingSupervisor(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Project setup
          </h2>
          <p className="text-sm text-slate-500">
            Manage your topic request, proposal, and approval status.
          </p>
        </div>
        <div className="flex gap-2 rounded-full bg-slate-100 p-1 text-sm">
          <button className="rounded-full bg-white px-3 py-1 font-medium text-slate-900 shadow-sm">
            Topic selection
          </button>
          <button className="rounded-full px-3 py-1 text-slate-600">
            Proposal
          </button>
          <button className="rounded-full px-3 py-1 text-slate-600">
            Status
          </button>
        </div>
      </div>
      <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Supervisor request</h2>
            <p className="mt-1 text-sm text-slate-600">
              {supervisorRequest?.status === "assigned"
                ? `${supervisorRequest.supervisor?.name} is assigned to your project.`
                : supervisorRequest
                  ? "Your request is waiting for a coordinator to assign a supervisor."
                  : "Ask the coordinator to assign a supervisor to your project."}
            </p>
          </div>
          {!supervisorRequest ? (
            <button
              type="button"
              onClick={handleSupervisorRequest}
              disabled={requestingSupervisor}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {requestingSupervisor
                ? "Sending request..."
                : "Request supervisor"}
            </button>
          ) : null}
        </div>
        {!supervisorRequest ? (
          <textarea
            value={requestMessage}
            onChange={(event) => setRequestMessage(event.target.value)}
            placeholder="Add a note for the coordinator (optional)"
            className="mt-4 min-h-20 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        ) : null}
        {requestError ? (
          <p className="mt-2 text-sm text-red-700">{requestError}</p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data?.topics ?? []).map((topic) => (
          <div
            key={topic.title}
            className={`rounded-2xl border p-4 ${topic.availability === "available" ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-80"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{topic.title}</h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${topic.availability === "available" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
              >
                {topic.availability}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{topic.department}</p>
            <button className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              {topic.availability === "available"
                ? "Request topic"
                : "Unavailable"}
            </button>
          </div>
        ))}
        {!data?.topics?.length ? (
          <p className="rounded-xl border border-slate-200 p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            No project topics are available yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function StudentDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const { data } = usePortalData();

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setMessage("");

    try {
      const response = await documentsApi.upload(formData);
      setDocuments((current) => [response.document, ...current]);
      setMessage("File uploaded successfully.");
    } catch (err) {
      setMessage(err.message || "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const previewDocuments = useMemo(() => documents.slice(0, 3), [documents]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Chapters</h2>
        <div className="mt-4 space-y-2">
          {(data?.chapters ?? []).map((chapter) => (
            <button
              key={chapter.title}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left"
            >
              <span className="font-medium text-slate-800">
                {chapter.title}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {chapter.status}
              </span>
            </button>
          ))}
          {!data?.chapters?.length ? (
            <p className="text-sm text-slate-500">
              No chapters have been created for your project.
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Chapter 4 — Methodology
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload your latest PDF or DOCX.
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Needs revision
            </span>
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center">
            <UploadCloud className="mx-auto text-indigo-600" size={24} />
            <p className="mt-3 font-medium text-slate-900">
              Drag and drop your chapter here
            </p>
            <p className="text-sm text-slate-500">
              PDF or DOCX only • 20MB max
            </p>
            <label className="mt-4 inline-flex cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
              {uploading ? "Uploading..." : "Browse files"}
              <input type="file" className="hidden" onChange={handleUpload} />
            </label>
          </div>
          {message ? (
            <p className="mt-3 text-sm text-slate-600">{message}</p>
          ) : null}
          {previewDocuments.length ? (
            <div className="mt-5 space-y-3 rounded-xl border border-slate-200 p-4">
              {previewDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {document.originalName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {Math.round(document.size / 1024)} KB • Uploaded to server
                    </p>
                  </div>
                  <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white">
                    Submit for review
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Final submission checklist
          </h2>
          <div className="mt-4 space-y-3">
            {[
              "All chapters approved",
              "Supervisor sign-off",
              "Title page included",
              "Declaration page included",
            ].map((item) => (
              <label
                key={item}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
              >
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-sm text-slate-700">{item}</span>
              </label>
            ))}
          </div>
          <button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Submit final project
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudentCommunicationPage() {
  const { data } = usePortalData();
  const messages = data?.messages ?? [];
  const supervisorName =
    data?.supervisorRequest?.supervisor?.name || "Supervisor";

  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Threads</h2>
        <div className="mt-4 space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">Message</p>
              </div>
              <p className="mt-1 text-sm text-slate-500">{message.body}</p>
            </div>
          ))}
          {!messages.length ? (
            <p className="text-sm text-slate-500">No messages yet.</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="font-semibold text-slate-900">{supervisorName}</h2>
            <p className="text-sm text-slate-500">Supervisor</p>
          </div>
          <Link
            to="/app/student/communication/meetings"
            className="text-sm font-medium text-indigo-600"
          >
            Meetings
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-2xl p-3 text-sm ${message.senderId === message.recipientId ? "bg-slate-100 text-slate-700" : "ml-auto bg-indigo-600 text-white"}`}
            >
              {message.body}
            </div>
          ))}
          {!messages.length ? (
            <p className="text-sm text-slate-500">
              Start a conversation with your supervisor.
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex items-end gap-2 rounded-2xl border border-slate-200 p-3">
          <textarea
            className="min-h-[80px] flex-1 resize-none border-0 outline-none"
            placeholder="Write a message"
          />
          <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudentDefensePage() {
  const { data } = usePortalData();
  const defense = data?.defenses?.[0];
  const defenseDate = defense?.scheduledAt
    ? new Date(defense.scheduledAt)
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Defense status
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {defenseDate
                ? `Your defense is on ${defenseDate.toLocaleDateString()}`
                : "Your defense has not been scheduled"}
            </h2>
          </div>
          <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
            RSVP
          </button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Defense details
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <span className="font-medium text-slate-900">Date</span>
              <p>
                {defenseDate ? defenseDate.toLocaleDateString() : "Not set"}
              </p>
            </div>
            <div>
              <span className="font-medium text-slate-900">Time</span>
              <p>
                {defenseDate
                  ? defenseDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Not set"}
              </p>
            </div>
            <div>
              <span className="font-medium text-slate-900">Venue</span>
              <p>{defense?.venue || "Not set"}</p>
            </div>
            <div>
              <span className="font-medium text-slate-900">Format</span>
              <p>{defense?.format || "Not set"}</p>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="font-semibold text-slate-900">Panel members</h3>
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-500">
                {defense
                  ? "Panel details will appear when members are assigned."
                  : "No panel has been assigned yet."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Pre-defense checklist
          </h2>
          <div className="mt-4 space-y-3">
            {[
              { label: "Final document submitted", checked: true },
              { label: "Slides ready", checked: false },
              { label: "Attendance confirmed", checked: true },
              { label: "Panel notified", checked: true },
            ].map((item) => (
              <label
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
              >
                <input
                  type="checkbox"
                  defaultChecked={item.checked}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-sm text-slate-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentAccountPage() {
  const { user } = useAuth();
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((value) => value[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1 text-sm">
        <button className="rounded-full bg-white px-3 py-1 font-medium text-slate-900 shadow-sm">
          Profile
        </button>
        <button className="rounded-full px-3 py-1 text-slate-600">
          Security
        </button>
        <button className="rounded-full px-3 py-1 text-slate-600">
          Notifications
        </button>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
              {initials || "U"}
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {user?.name || "User"}
              </p>
              <p className="text-sm text-slate-500">
                {user?.role || "student"} • {user?.studentId || "No student ID"}
              </p>
            </div>
          </div>
          <button className="mt-4 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
            Change photo
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              First name
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              defaultValue={user?.firstName || ""}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Last name
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              defaultValue={user?.lastName || ""}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Department
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              defaultValue={user?.department || ""}
            />
          </div>
          <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

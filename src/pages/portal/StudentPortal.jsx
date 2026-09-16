import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  MessageSquare,
  CalendarDays,
  ArrowRight,
  UploadCloud,
  BellRing,
} from "lucide-react";
import { documentsApi } from "../../services/api";

const metrics = [
  {
    label: "Project stage",
    value: "Chapter review — stage 3 of 6",
    tone: "indigo",
  },
  { label: "Chapters submitted", value: "3 / 5", tone: "slate" },
  { label: "Days to deadline", value: "14", tone: "amber" },
  { label: "Overall grade", value: "Not released", tone: "slate" },
];

const timeline = [
  "Proposal",
  "Supervisor assigned",
  "Chapter writing",
  "Chapter review",
  "Defense",
  "Final submission",
];

const notifications = [
  { title: "Supervisor feedback received", time: "10m ago", tone: "indigo" },
  { title: "Chapter 4 uploaded", time: "1h ago", tone: "emerald" },
  { title: "Defense venue updated", time: "2h ago", tone: "amber" },
];

export function StudentDashboard() {
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
                Upload Chapter 4 — Methodology before June 18
              </h2>
              <p className="text-sm text-slate-600">
                Your draft is ready for supervisor review.
              </p>
            </div>
          </div>
          <Link
            to="/app/student/documents/upload"
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
              <p className="text-sm text-slate-500">Current progress</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {timeline.map((step, index) => {
                const completed = index < 4;
                const active = index === 4;
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
              {notifications.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div
                    className={`mt-0.5 rounded-lg p-2 ${item.tone === "indigo" ? "bg-indigo-50 text-indigo-600" : item.tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                  >
                    <BellRing size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
              PO
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Prof. Mercy Osei</h2>
              <p className="text-sm text-slate-500">Computer Science</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} /> Last message 12 mins ago
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={15} /> Next meeting June 18, 10:00
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              Message
            </button>
            <button className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
              View meetings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentProjectPage() {
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            title: "Smart campus energy dashboard",
            department: "Computer Science",
            availability: "Available",
          },
          {
            title: "Clinical decision support assistant",
            department: "Information Systems",
            availability: "Unavailable",
          },
          {
            title: "Autonomous irrigation analytics",
            department: "Software Engineering",
            availability: "Available",
          },
        ].map((topic) => (
          <div
            key={topic.title}
            className={`rounded-2xl border p-4 ${topic.availability === "Available" ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-80"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{topic.title}</h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${topic.availability === "Available" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
              >
                {topic.availability}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{topic.department}</p>
            <button className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              Request topic
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudentDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

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
          {[
            { title: "Chapter 1 — Introduction", status: "Approved" },
            { title: "Chapter 2 — Literature review", status: "Under review" },
            { title: "Chapter 3 — Requirements", status: "Pending" },
            { title: "Chapter 4 — Methodology", status: "Needs revision" },
          ].map((chapter) => (
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
  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Threads</h2>
        <div className="mt-4 space-y-2">
          {[
            {
              title: "Supervisor discussion",
              preview: "Please send the revised chapter by Friday.",
              unread: 2,
            },
            {
              title: "Defense coordination",
              preview: "The panel has submitted availability.",
              unread: 0,
            },
          ].map((thread) => (
            <div
              key={thread.title}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{thread.title}</p>
                {thread.unread ? (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {thread.unread}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-500">{thread.preview}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="font-semibold text-slate-900">Prof. Mercy Osei</h2>
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
          <div className="max-w-[80%] rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">
            I have reviewed the latest draft. Please update Chapter 4.
          </div>
          <div className="ml-auto max-w-[80%] rounded-2xl bg-indigo-600 p-3 text-sm text-white">
            I will upload the revised version before Friday.
          </div>
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
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Defense status
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              Your defense is on June 28
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
              <p>June 28, 2026</p>
            </div>
            <div>
              <span className="font-medium text-slate-900">Time</span>
              <p>09:30</p>
            </div>
            <div>
              <span className="font-medium text-slate-900">Venue</span>
              <p>Conference Hall B</p>
            </div>
            <div>
              <span className="font-medium text-slate-900">Format</span>
              <p>In person</p>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="font-semibold text-slate-900">Panel members</h3>
            <div className="mt-3 space-y-3">
              {[
                { name: "Prof. Mercy Osei", role: "Supervisor" },
                { name: "Dr. John Miles", role: "External reviewer" },
                { name: "Dr. Amina Yusuf", role: "Second reader" },
              ].map((member) => (
                <div
                  key={member.name}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700">
                      {member.name.split(" ")[0][0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.name}
                      </p>
                      <p className="text-sm text-slate-500">{member.role}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {member.role}
                  </span>
                </div>
              ))}
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
              AB
            </div>
            <div>
              <p className="font-semibold text-slate-900">Ada Bello</p>
              <p className="text-sm text-slate-500">Student • 20261170</p>
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
              defaultValue="Ada"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Last name
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              defaultValue="Bello"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Department
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              defaultValue="Computer Science"
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

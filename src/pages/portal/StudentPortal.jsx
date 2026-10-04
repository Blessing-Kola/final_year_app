import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  MessageSquare,
  CalendarDays,
  ArrowRight,
  UploadCloud,
  BellRing,
  Lock,
  FileText,
} from "lucide-react";
import {
  activitiesApi,
  defenceApi,
  documentsApi,
  proposalApi,
  supervisorApi,
  topicApi,
} from "../../services/api";
import { Feedback, StatusBadge } from "../../components/StatusBadge";
import MessageThread from "../../components/MessageThread";
import DefenceChecklist from "../../components/DefenceChecklist";
import DefenceDayCard from "../../components/DefenceDayCard";
import { StudentMeetingRequests } from "../../components/MeetingRequests";
import StudentChapters from "../../components/StudentChapters";
import { SCORE_MAX } from "../../lib/scores";
import { PROJECT_TIMELINE, readStageProgress } from "../../lib/projectStage";
import { formatDefenceDate, formatDefenceTime, formatTimestamp } from "../../lib/defenceDay";
import { usePortalData } from "../../hooks/usePortalData";
import { useDefenceSchedule } from "../../hooks/useDefenceSchedule";
import { useAuth } from "../../context/useAuth";

// Both live in src/lib/projectStage.js, beside the server's derivation of the same
// stage, so the timeline a student sees and the one the supervisor sees are drawn
// from one list. The local names are kept because the rest of this file reads better
// with them.
const timeline = PROJECT_TIMELINE;
const getStageProgress = readStageProgress;

export function StudentDashboard() {
  const [activities, setActivities] = useState([]);
  const [supervisorRequest, setSupervisorRequest] = useState(null);
  const { data } = usePortalData();
  const { schedule: defenceDay, loading: defenceLoading, error: defenceError } = useDefenceSchedule();
  const project =
    data?.project && typeof data.project === "object" ? data.project : null;
  const chapters = Array.isArray(data?.chapters) ? data.chapters : [];

  const {
    progress: projectProgress,
    completedSteps,
    currentIndex: currentStepIndex,
    currentFill: currentStepFill,
    currentStage,
  } = getStageProgress(project);

  const metrics = [
    { label: "Project stage", value: project?.stage || "Not started" },
    {
      label: "Chapters approved",
      value: `${chapters.filter((chapter) => chapter.status === "approved").length} / ${chapters.length || 5}`,
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

      <DefenceDayCard schedule={defenceDay} loading={defenceLoading} error={defenceError} />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Project timeline
              </h2>
              <p className="text-sm text-slate-500">
                {project ? `${projectProgress}% complete` : "No project yet"}
              </p>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              {project ? (
                currentStage ? (
                  <>
                    Current stage:{" "}
                    <span className="font-medium text-slate-900">
                      {currentStage}
                    </span>
                  </>
                ) : (
                  "All stages complete."
                )
              ) : (
                "Your timeline appears once a project has been created."
              )}
            </p>

            {project ? (
              <div
                className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={projectProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Project progress"
              >
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${projectProgress}%` }}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {timeline.map((step, index) => {
                const completed = index < completedSteps;
                const current = index === currentStepIndex;
                // Completed stages are fully filled; the current one fills by how
                // far the student is through that stage; later ones stay empty.
                const fill = completed ? 100 : current ? currentStepFill : 0;
                return (
                  <div
                    key={step}
                    className={`relative min-w-[120px] flex-1 overflow-hidden rounded-xl border p-3 ${current ? "border-indigo-300" : "border-slate-200"}`}
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 bg-indigo-50 transition-all duration-500"
                      style={{ width: `${fill}%` }}
                    />
                    <div className="relative flex flex-col items-center gap-2 text-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${completed ? "bg-indigo-600 text-white" : current ? "border-2 border-indigo-600 bg-white text-indigo-600" : "bg-slate-100 text-slate-500"}`}
                      >
                        {completed ? <CheckCircle2 size={18} /> : index + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {step}
                      </span>
                      {current ? (
                        <span className="text-xs font-medium text-indigo-600">
                          In progress
                        </span>
                      ) : null}
                    </div>
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

function StatusSummaryCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-3 text-sm">{children}</div>
    </div>
  );
}

function StatusSummaryRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{children}</span>
    </div>
  );
}

export function StudentProjectPage() {
  const [activeTab, setActiveTab] = useState("topic");
  const [supervisorRequest, setSupervisorRequest] = useState(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestingSupervisor, setRequestingSupervisor] = useState(false);
  const [requestError, setRequestError] = useState("");
  const { data, loading: portalLoading } = usePortalData();

  // Mutations return the authoritative record; otherwise fall back to the shared portal payload.
  const [topicOverride, setTopicOverride] = useState(null);
  const [proposalOverride, setProposalOverride] = useState(null);
  const topic = topicOverride ?? data?.topic ?? null;
  const proposal = proposalOverride ?? data?.proposal ?? null;

  const [topicTitle, setTopicTitle] = useState("");
  const [submittingTopic, setSubmittingTopic] = useState(false);
  const [topicError, setTopicError] = useState("");
  const [topicSuccess, setTopicSuccess] = useState("");

  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalFile, setProposalFile] = useState(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [proposalSuccess, setProposalSuccess] = useState("");

  useEffect(() => {
    supervisorApi
      .getRequest()
      .then((response) => setSupervisorRequest(response.request ?? null))
      .catch(() => setSupervisorRequest(null));
  }, []);

  const topicStatus = topic?.status ?? null;
  const topicAccepted = topicStatus === "accepted";
  const canSubmitTopic = !topic || topicStatus === "declined";
  const proposalLocked = !topic || topicStatus === "pending";

  const project = data?.project ?? null;
  const {
    progress: projectProgress,
    completedSteps,
    currentIndex: currentStepIndex,
    currentFill: currentStepFill,
    currentStage,
    nextStage,
  } = getStageProgress(project);

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

  const handleSubmitTopic = async (event) => {
    event.preventDefault();
    const title = topicTitle.trim();
    if (!title) {
      setTopicError("Enter your project topic before submitting.");
      return;
    }

    setSubmittingTopic(true);
    setTopicError("");
    setTopicSuccess("");

    try {
      const response = await topicApi.submit(title);
      setTopicOverride(response.topic ?? null);
      setTopicTitle("");
      setTopicSuccess("Your topic was submitted and is awaiting supervisor review.");
    } catch (error) {
      setTopicError(error.message || "Unable to submit your topic.");
    } finally {
      setSubmittingTopic(false);
    }
  };

  const handleSubmitProposal = async (event) => {
    event.preventDefault();

    if (!topicAccepted) {
      setProposalError("Your topic must be accepted before you can submit a proposal.");
      return;
    }

    const title = proposalTitle.trim() || topic?.title || "";
    if (!title) {
      setProposalError("Enter a project title for your proposal.");
      return;
    }

    setSubmittingProposal(true);
    setProposalError("");
    setProposalSuccess("");

    try {
      let documentId = null;
      if (proposalFile) {
        const formData = new FormData();
        formData.append("file", proposalFile);
        const uploadResponse = await documentsApi.upload(formData);
        documentId = uploadResponse.document?.id ?? null;
      }

      const response = await proposalApi.submit({
        title,
        description: proposalDescription.trim(),
        documentId,
      });
      setProposalOverride(response.proposal ?? null);
      setProposalFile(null);
      setProposalSuccess("Your proposal was submitted successfully.");
    } catch (error) {
      setProposalError(error.message || "Unable to submit your proposal.");
    } finally {
      setSubmittingProposal(false);
    }
  };

  const tabs = [
    { id: "topic", label: "Topic selection" },
    { id: "proposal", label: "Proposal", locked: proposalLocked },
    { id: "status", label: "Status" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Project setup</h2>
          <p className="text-sm text-slate-500">
            Submit your topic, then your proposal once it has been accepted.
          </p>
        </div>
        <div className="flex gap-2 rounded-full bg-slate-100 p-1 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.locked}
              title={tab.locked ? "Available once your topic is accepted" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 disabled:cursor-not-allowed ${
                activeTab === tab.id
                  ? "bg-white font-medium text-slate-900 shadow-sm"
                  : tab.locked
                    ? "text-slate-400"
                    : "text-slate-600"
              }`}
            >
              {tab.locked ? <Lock size={13} /> : null}
              {tab.label}
            </button>
          ))}
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
              {requestingSupervisor ? "Sending request..." : "Request supervisor"}
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

      {activeTab === "topic" ? (
        <div className="space-y-5">
          {portalLoading && !topic ? (
            <p className="text-sm text-slate-500">Loading your topic...</p>
          ) : null}

          {topic ? (
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Submitted topic</p>
                  <h3 className="mt-1 font-semibold text-slate-900">
                    {topic.title || "Untitled topic"}
                  </h3>
                </div>
                <StatusBadge status={topic.status} />
              </div>

              {topicStatus === "pending" ? (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Your topic is waiting for supervisor or coordinator review.
                </div>
              ) : null}

              {topicStatus === "accepted" ? (
                <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  Your topic has been accepted. You can now submit your proposal on the
                  Proposal tab.
                </div>
              ) : null}

              {topicStatus === "declined" ? (
                <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                  <p className="font-medium">Your topic was declined.</p>
                  {topic.declineReason ? (
                    <p className="mt-1">{topic.declineReason}</p>
                  ) : null}
                  <p className="mt-1">You can submit a revised topic below.</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {!portalLoading && !topic ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              You have not submitted a project topic yet.
            </p>
          ) : null}

          {canSubmitTopic ? (
            <form onSubmit={handleSubmitTopic} className="rounded-2xl border border-slate-200 p-5">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {topicStatus === "declined"
                  ? "Submit a revised project topic"
                  : "Propose your project topic"}
              </label>
              <input
                value={topicTitle}
                onChange={(event) => setTopicTitle(event.target.value)}
                placeholder="e.g. A machine learning approach to early disease detection"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
              />
              <div className="mt-3 space-y-2">
                <Feedback>{topicError}</Feedback>
                <Feedback tone="success">{topicSuccess}</Feedback>
              </div>
              <button
                type="submit"
                disabled={submittingTopic}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {submittingTopic ? "Submitting..." : "Submit Topic"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              {topicStatus === "pending"
                ? "You cannot submit a new topic while the current one is awaiting review."
                : "Your topic has been accepted, so no further submission is needed."}
            </p>
          )}
        </div>
      ) : null}

      {activeTab === "proposal" ? (
        topicAccepted ? (
          <div className="space-y-5">
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Your topic was accepted — you can submit your proposal.
            </p>

            {proposal ? (
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Submitted proposal</p>
                    <h3 className="mt-1 font-semibold text-slate-900">
                      {proposal.title || "Untitled proposal"}
                    </h3>
                  </div>
                  <StatusBadge status={proposal.status} />
                </div>
                {proposal.description ? (
                  <p className="mt-3 text-sm text-slate-600">{proposal.description}</p>
                ) : null}
                {proposal.submittedAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Submitted {new Date(proposal.submittedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={handleSubmitProposal} className="rounded-2xl border border-slate-200 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Project title
                </label>
                <input
                  value={proposalTitle}
                  onChange={(event) => setProposalTitle(event.target.value)}
                  placeholder={topic?.title || "Project title"}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Leave blank to use your accepted topic title.
                </p>
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Proposal description
                </label>
                <textarea
                  value={proposalDescription}
                  onChange={(event) => setProposalDescription(event.target.value)}
                  placeholder="Summarise your proposed project, objectives, and methodology."
                  className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Proposal document (optional)
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
                  <FileText size={16} className="text-indigo-600" />
                  {proposalFile ? proposalFile.name : "Attach a PDF or DOCX (20MB max)"}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => setProposalFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="mt-3 space-y-2">
                <Feedback>{proposalError}</Feedback>
                <Feedback tone="success">{proposalSuccess}</Feedback>
              </div>
              <button
                type="submit"
                disabled={submittingProposal}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {submittingProposal ? "Submitting..." : "Submit Proposal"}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
            <Lock className="mx-auto text-slate-400" size={22} />
            <p className="mt-3 font-semibold text-slate-900">Proposal locked</p>
            <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">
              {topicStatus === "declined"
                ? "Your topic was declined. Submit a revised topic and wait for it to be accepted before submitting your proposal."
                : "Your topic is awaiting supervisor approval. You can submit your proposal after your topic has been accepted."}
            </p>
            {topicStatus === "declined" && topic?.declineReason ? (
              <p className="mx-auto mt-3 max-w-lg rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                Reason: {topic.declineReason}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setActiveTab("topic")}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              {topicStatus === "declined" ? "Submit a revised topic" : "Go to Topic Selection"}
            </button>
          </div>
        )
      ) : null}

      {activeTab === "status" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <StatusSummaryCard title="Topic">
            <StatusSummaryRow label="Submitted topic">
              {topic?.title || "Not submitted"}
            </StatusSummaryRow>
            <StatusSummaryRow label="Topic status">
              <StatusBadge status={topic?.status} fallback="Not submitted" />
            </StatusSummaryRow>
          </StatusSummaryCard>

          <StatusSummaryCard title="Supervisor">
            <StatusSummaryRow label="Supervisor">
              {supervisorRequest?.supervisor?.name || "Not assigned"}
            </StatusSummaryRow>
            <StatusSummaryRow label="Assignment status">
              <StatusBadge
                status={supervisorRequest?.status}
                fallback="Not assigned"
              />
            </StatusSummaryRow>
          </StatusSummaryCard>

          <StatusSummaryCard title="Proposal">
            <StatusSummaryRow label="Proposal status">
              <StatusBadge status={proposal?.status} fallback="Not submitted" />
            </StatusSummaryRow>
            <StatusSummaryRow label="Submission">
              <StatusBadge status={topicAccepted ? "available" : "not available"} />
            </StatusSummaryRow>
          </StatusSummaryCard>

          <StatusSummaryCard title="Project stage">
            <StatusSummaryRow label="Current stage">
              {project ? currentStage || "All stages complete" : "Not started"}
            </StatusSummaryRow>
            {project ? (
              <>
                <StatusSummaryRow label="Progress">
                  {projectProgress}%
                </StatusSummaryRow>
                {/* Overall fill, then one segment per stage so the student can see
                    which stage they are in and how far through it they are. */}
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={projectProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Project progress"
                >
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${projectProgress}%` }}
                  />
                </div>
                <div className="flex gap-1">
                  {timeline.map((step, index) => {
                    const completed = index < completedSteps;
                    const current = index === currentStepIndex;
                    // Completed stages are full; the current one fills by how far
                    // the student is through it; later stages stay empty.
                    const fill = completed ? 100 : current ? currentStepFill : 0;
                    return (
                      <div
                        key={step}
                        title={step}
                        aria-hidden="true"
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                      >
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  Step {Math.min(completedSteps + 1, timeline.length)} of{" "}
                  {timeline.length}
                  {nextStage ? ` · Next: ${nextStage}` : ""}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Your progress appears once a project has been created.
              </p>
            )}
          </StatusSummaryCard>
        </div>
      ) : null}
    </div>
  );
}

export function StudentDocumentsPage() {
  return <StudentChapters />;
}

export function StudentCommunicationPage() {
  const { data } = usePortalData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("messages");
  const supervisor = data?.supervisorRequest?.supervisor ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1 text-sm">
        {[
          { id: "messages", label: "Messages" },
          { id: "meetings", label: "Meeting requests" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={`rounded-full px-3 py-1 font-medium ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "messages" ? (
        // A student has exactly one counterpart, so the thread is the whole page —
        // a one-entry conversation list would add nothing.
        <MessageThread
          partnerId={supervisor?.id}
          partnerName={supervisor?.name}
          partnerSubtitle="Supervisor"
          currentUserId={user?.id}
          emptyHint="No supervisor yet. Once a supervisor accepts your request you can message them here."
        />
      ) : (
        <StudentMeetingRequests supervisor={supervisor} />
      )}
    </div>
  );
}

export function StudentDefensePage() {
  const { schedule, loading: scheduleLoading, error: scheduleError } = useDefenceSchedule();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    defenceApi
      .listResults()
      .then((response) => {
        if (!active) return;
        // The server only returns a row once it has been published, so anything
        // here is safe to show.
        setResult(Array.isArray(response.results) ? response.results[0] ?? null : null);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Your result could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-indigo-600">Defence status</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          {scheduleLoading
            ? "Loading your defence details…"
            : schedule
              ? `Your defence is on ${formatDefenceDate(schedule.scheduledDate)}`
              : "Your defence has not been scheduled yet"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {schedule
            ? `${formatDefenceTime(schedule.startTime)} at ${schedule.venue}. Your supervisor and the coordinator see the same schedule.`
            : "You will be notified as soon as the coordinator publishes the defence day."}
        </p>
      </div>

      <DefenceDayCard schedule={schedule} loading={scheduleLoading} error={scheduleError} />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Final result</h2>

          <Feedback tone="error">{error}</Feedback>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading your result…</p>
          ) : result ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Supervisor score (50%)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {result.supervisorScore} / {Number(result.supervisorMax) || SCORE_MAX}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Defence score (50%)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {result.defenceScore} / {Number(result.defenceMax) || SCORE_MAX}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700">
                  Final score
                </p>
                <p className="mt-1 text-3xl font-semibold text-emerald-900">
                  {result.finalScore}
                </p>
                <p className="mt-1 text-sm text-emerald-800">Grade {result.grade}</p>
              </div>
              <p className="text-xs text-slate-500">
                Published {formatTimestamp(result.publishedAt)}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Your final score appears here once the coordinator has collated the
              supervisor and defence scores and published the result. Until then it is
              not visible to you.
            </div>
          )}
        </div>

        <DefenceChecklist />
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
  const idLabel = user?.role === "student" ? "Student ID" : "Staff ID";
  const idValue = user?.role === "student" ? user?.studentId : user?.staffId;

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
                {user?.role || "student"} •{" "}
                {idValue || `No ${idLabel.toLowerCase()}`}
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

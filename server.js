import express from "express";
import cors from "cors";
import "dotenv/config";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { supabase } from "./src/services/supabaseServer.js";
import { mergeConversation } from "./src/lib/messages.js";
import {
    SCORE_MAX,
    calculateReportScore,
    describeResult,
    isWithinRange,
} from "./src/lib/scores.js";
import {
    PROJECT_STAGE_INDEX,
    PROJECT_STATUS,
    PROJECT_TIMELINE,
    deriveProjectStage,
    isSubmittedProposal,
    progressForStage,
} from "./src/lib/projectStage.js";

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");

// Refuse to boot without a real secret. A built-in fallback would let anyone who
// has read this source mint valid tokens for any account.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error(
        "JWT_SECRET is not set. Copy .env.example to .env and provide a long random value.",
    );
}

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Dev serves the client from Vite on a different port, so the API is reached
// cross-origin there. Accept the configured client URL plus any loopback origin
// (localhost or 127.0.0.1, whichever port Vite settled on) and reject the rest.
// This must stay ahead of the routes below: anything registered before it would
// answer without these headers and the browser would block the response.
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
    cors({
        origin: (origin, callback) => {
            // No Origin header: same-origin request, curl, or a server-to-server call.
            if (!origin || origin === CLIENT_URL || LOOPBACK_ORIGIN.test(origin)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        credentials: true,
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ALLOWED_UPLOAD_EXTENSIONS = new Set([
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".txt",
    ".csv",
    ".zip",
    ".png",
    ".jpg",
    ".jpeg",
]);

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

// Never build the stored name from the client-supplied filename: it can contain
// path separators. Keep only the extension and generate the rest ourselves.
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
            return cb(new Error(`Unsupported file type "${extension || "unknown"}". Allowed: ${[...ALLOWED_UPLOAD_EXTENSIONS].join(", ")}`));
        }
        cb(null, true);
    },
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
        req.user = user;
        next();
    });
};

const createToken = (user) =>
    jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "1d" });

const normalizeUser = (user) => {
    const base = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
        email: user.email,
        role: user.role,
        department: user.department,
    };

    if (user.role === "student") {
        base.studentId = user.studentId ?? null;
    }

    if (user.role === "supervisor" || user.role === "coordinator") {
        base.staffId = user.staffId ?? null;
    }

    return base;
};

const normalizeDocument = (document) => ({
    id: document.id,
    filename: document.filename,
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    uploadedBy: document.uploadedBy,
    uploadedAt: document.uploadedAt,
    // The server-side `path` is deliberately not exposed.
    downloadUrl: `/documents/${document.id}/download`,
});

const findUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();
    if (error) throw error;
    return data;
};

const findUserById = async (id) => {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (error) throw error;
    return data;
};

const createUser = async (userData) => {
    const { data, error } = await supabase
        .from("users")
        .insert(userData)
        .select()
        .single();
    if (error) throw error;
    return data;
};

const createDocumentRecord = async (documentData) => {
    const { data, error } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();
    if (error) throw error;
    return data;
};

const createActivity = async (activityData) => {
    const { data, error } = await supabase
        .from("activities")
        .insert(activityData)
        .select()
        .single();
    if (error) throw error;
    return data;
};

const listActivitiesForUser = async (userId) => {
    const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("userId", userId)
        .order("createdAt", { ascending: false })
        .limit(20);
    if (error) throw error;
    return data;
};

const listDocumentsForUser = async (userId) => {
    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("uploadedBy", userId)
        .order("uploadedAt", { ascending: false });
    if (error) throw error;
    return data;
};

const getActiveSupervisorRequest = async (studentId) => {
    const { data, error } = await supabase
        .from("supervisor_requests")
        .select("*")
        .eq("studentId", studentId)
        .in("status", ["pending", "assigned"])
        .maybeSingle();
    if (error) throw error;
    return data;
};

const getSupervisorRequestDetails = async (request) => {
    if (!request) return null;

    const [student, supervisor] = await Promise.all([
        findUserById(request.studentId),
        request.supervisorId ? findUserById(request.supervisorId) : null,
    ]);

    return {
        ...request,
        student: student ? normalizeUser(student) : null,
        supervisor: supervisor ? normalizeUser(supervisor) : null,
    };
};

const requireRole = (role) => (req, res, next) => {
    if (req.user.role !== role) {
        return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
};

const requireAnyRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
};

const getStudentTopic = async (studentId) => {
    const { data, error } = await supabase
        .from("student_topics")
        .select("*")
        .eq("studentId", studentId)
        .maybeSingle();
    if (error) throw error;
    return data ?? null;
};

const getStudentProposal = async (studentId) => {
    const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("studentId", studentId)
        .maybeSingle();
    if (error) throw error;
    return data ?? null;
};

const withStudent = async (record) => {
    if (!record) return null;
    const student = await findUserById(record.studentId);
    return { ...record, student: student ? normalizeUser(student) : null };
};

// Coordinators can review anyone; supervisors only their assigned students.
const canReviewStudent = async (user, studentId) => {
    if (user.role === "coordinator") return true;
    if (user.role !== "supervisor") return false;

    const { data, error } = await supabase
        .from("supervisor_requests")
        .select("id")
        .eq("studentId", studentId)
        .eq("supervisorId", user.id)
        .eq("status", "assigned")
        .maybeSingle();
    if (error) throw error;
    return Boolean(data);
};

const listAssignedStudentIds = async (supervisorId) => {
    const { data, error } = await supabase
        .from("supervisor_requests")
        .select("studentId")
        .eq("supervisorId", supervisorId)
        .eq("status", "assigned");
    if (error) throw error;
    return data.map((assignment) => assignment.studentId);
};

const notifyStudentSupervisor = async (studentId, activity) => {
    const { data: assignments, error } = await supabase
        .from("supervisor_requests")
        .select("supervisorId")
        .eq("studentId", studentId)
        .eq("status", "assigned")
        .maybeSingle();
    if (error) throw error;

    if (assignments?.supervisorId) {
        await createActivity({ ...activity, userId: assignments.supervisorId });
        return;
    }

    const { data: coordinators, error: coordinatorError } = await supabase
        .from("users")
        .select("id")
        .eq("role", "coordinator");
    if (coordinatorError) throw coordinatorError;

    if (coordinators.length) {
        await supabase.from("activities").insert(
            coordinators.map((coordinator) => ({ ...activity, userId: coordinator.id })),
        );
    }
};

// Notifications and activity logs are side effects. If one fails the primary action
// (submitting a topic, accepting, etc.) must still succeed rather than reporting a 500.
const safeSideEffect = async (label, task) => {
    try {
        await task();
    } catch (error) {
        console.warn(`[side-effect] ${label} failed: ${error.message}`);
    }
};

const fetchRows = async (table, configure = (query) => query) => {
    let query = supabase.from(table).select("*");
    query = configure(query);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
};

const fetchCount = async (table, configure = (query) => query) => {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    query = configure(query);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
};

// Portal reads for the topic/proposal tables degrade instead of failing the whole
// portal when the schema has not been applied yet. The API routes still report 500.
const fetchRowsSafe = async (table, configure) => {
    try {
        return await fetchRows(table, configure);
    } catch (error) {
        console.warn(`[portal] ${table} unavailable: ${error.message}`);
        return [];
    }
};

const getStudentTopicSafe = async (studentId) => {
    try {
        return await getStudentTopic(studentId);
    } catch (error) {
        console.warn(`[portal] student_topics unavailable: ${error.message}`);
        return null;
    }
};

const getStudentProposalSafe = async (studentId) => {
    try {
        return await getStudentProposal(studentId);
    } catch (error) {
        console.warn(`[portal] proposals unavailable: ${error.message}`);
        return null;
    }
};

const MEETING_MODES = new Set(["in-person", "online"]);

const getAssignedSupervisorId = async (studentId) => {
    const { data, error } = await supabase
        .from("supervisor_requests")
        .select("supervisorId")
        .eq("studentId", studentId)
        .eq("status", "assigned")
        .maybeSingle();
    if (error) throw error;
    return data?.supervisorId ?? null;
};

const MAX_MESSAGE_LENGTH = 4000;

// Messaging is restricted to the pair the assignment table already links: a
// student may only reach their supervisor, a supervisor only their assigned
// students. The partner id is re-checked here rather than trusted, so a forged
// recipientId cannot address an unrelated account.
const resolveMessagePartner = async (user, partnerId) => {
    if (!partnerId) {
        return { denied: { status: 400, message: "Choose who the message is for" } };
    }

    if (user.role === "student") {
        const supervisorId = await getAssignedSupervisorId(user.id);
        if (!supervisorId) {
            return {
                denied: {
                    status: 403,
                    message: "You need an assigned supervisor before you can send messages",
                },
            };
        }
        if (partnerId !== supervisorId) {
            return { denied: { status: 403, message: "You can only message your assigned supervisor" } };
        }
        return { partnerId: supervisorId };
    }

    if (user.role === "supervisor") {
        const allowed = await canReviewStudent(user, partnerId);
        if (!allowed) {
            return { denied: { status: 403, message: "This student is not assigned to you" } };
        }
        return { partnerId };
    }

    return { denied: { status: 403, message: "Insufficient permissions" } };
};

const formatMeetingDate = (value) => {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return String(value ?? "");
    return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const formatMeetingTime = (value) => {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
    if (!match) return String(value ?? "");
    const hours = Number(match[1]);
    const suffix = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
};

const describeMeetingWhen = (request) =>
    `${formatMeetingDate(request.date)} at ${formatMeetingTime(request.time)}`;

// --- Defence day and score helpers -------------------------------------------

const MAX_CHECKLIST_TITLE = 200;
const MAX_CHECKLIST_NOTES = 1000;

const describeDefenceWhen = (schedule) =>
    schedule
        ? `${formatMeetingDate(schedule.scheduledDate)} at ${formatMeetingTime(schedule.startTime)}`
        : "";

// The defence day is one event, so the current schedule is the latest version of
// it. Nothing is ever edited in place: publishing again records a new version.
const getCurrentDefenceSchedule = async () => {
    const rows = await fetchRows("defence_schedules", (query) =>
        query.order("publishedAt", { ascending: false }).limit(1),
    );
    return rows[0] ?? null;
};

const findDefenceResult = async (studentId) => {
    const { data, error } = await supabase
        .from("defence_results")
        .select("*")
        .eq("studentId", studentId)
        .maybeSingle();
    if (error) throw error;
    return data ?? null;
};

// One result row per student with a project, so the coordinator's score table
// needs no join to list everyone. Idempotent, and called both when a schedule is
// published and whenever a score page loads — the same self-healing read the
// student portal already does for a half-started project.
const ensureDefenceResults = async (schedule) => {
    if (!schedule) return fetchRows("defence_results");

    const [projects, existing, assignments] = await Promise.all([
        fetchRows("projects"),
        fetchRows("defence_results"),
        fetchRows("supervisor_requests", (query) => query.eq("status", "assigned")),
    ]);

    const supervisorByStudent = new Map(
        assignments.map((assignment) => [assignment.studentId, assignment.supervisorId]),
    );
    const byStudent = new Map(existing.map((row) => [row.studentId, row]));
    const now = new Date().toISOString();

    const toInsert = projects
        .filter((project) => project?.studentId && !byStudent.has(project.studentId))
        .map((project) => ({
            studentId: project.studentId,
            projectId: project.id,
            scheduleId: schedule.id,
            supervisorId: supervisorByStudent.get(project.studentId) ?? null,
            supervisorMax: SCORE_MAX,
            defenceMax: SCORE_MAX,
            supervisorStatus: "pending",
            status: "collecting",
            createdAt: now,
            updatedAt: now,
        }));

    if (toInsert.length) {
        const { error } = await supabase.from("defence_results").insert(toInsert);
        // 23505 is a unique violation on "studentId": another request seeded the
        // same student between the read above and this insert. The row exists
        // either way, so this is not a failure.
        if (error && error.code !== "23505") throw error;
    }

    // Carry an ungraded result over to the newly published day. A published
    // result is history and is deliberately left pointing at its own schedule.
    const stale = existing.filter(
        (row) => row.status !== "published" && row.scheduleId !== schedule.id,
    );
    if (stale.length) {
        await supabase
            .from("defence_results")
            .update({ scheduleId: schedule.id, updatedAt: now })
            .in("id", stale.map((row) => row.id));
    }

    return fetchRows("defence_results");
};

// Append-only. Callers pass only the fields that actually changed, so the trail
// reads as a sequence of edits rather than a series of snapshots.
const recordScoreAudit = async (entries) => {
    if (!entries.length) return;

    const { error } = await supabase.from("defence_score_audit").insert(entries);
    if (error) throw error;
};

const notifyCoordinators = async (activity) => {
    const coordinators = await fetchRows("users", (query) => query.eq("role", "coordinator"));
    if (!coordinators.length) return;

    await supabase.from("activities").insert(
        coordinators.map((coordinator) => ({ ...activity, userId: coordinator.id })),
    );
};

// Everyone who has a stake in the defence day: students with a project, and
// supervisors with at least one assigned student.
const notifyDefenceAudience = async (schedule, { updated = false } = {}) => {
    const [projects, assignments] = await Promise.all([
        fetchRows("projects"),
        fetchRows("supervisor_requests", (query) => query.eq("status", "assigned")),
    ]);

    const recipients = new Set(projects.map((project) => project.studentId).filter(Boolean));
    assignments.forEach((assignment) => {
        if (assignment.supervisorId) recipients.add(assignment.supervisorId);
    });
    if (!recipients.size) return;

    const activity = {
        type: updated ? "defence_updated" : "defence_scheduled",
        title: updated ? "Defence schedule updated" : "Defence day scheduled",
        body: `${describeDefenceWhen(schedule)} — ${schedule.venue}.`,
        tone: "indigo",
    };

    await supabase.from("activities").insert(
        [...recipients].map((userId) => ({ ...activity, userId })),
    );
};

// Both score writes share the same guard: a published result is final, and the
// caller is told why rather than silently ignored.
const refuseIfPublished = (result) =>
    result.status === "published"
        ? { status: 409, message: "This result has been published and can no longer be changed" }
        : null;

const findMeetingRequest = async (requestId) => {
    const { data, error } = await supabase
        .from("meeting_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();
    if (error) throw error;
    return data ?? null;
};

const listMeetingRequestsForStudent = (studentId) =>
    fetchRows("meeting_requests", (query) =>
        query.eq("studentId", studentId).order("createdAt", { ascending: false }),
    );

const listMeetingRequestsForSupervisor = async (supervisorId) => {
    const studentIds = await listAssignedStudentIds(supervisorId);
    if (!studentIds.length) return [];

    const requests = await fetchRows("meeting_requests", (query) =>
        query.in("studentId", studentIds).order("createdAt", { ascending: false }),
    );
    return Promise.all(requests.map(withStudent));
};

// --- Chapters: strict serial approval ----------------------------------------
// A chapter only opens once the one before it has been approved. The lock is
// derived from the stored statuses on every read, never stored and never taken
// from the client, so it cannot be edited around.

const CHAPTER_COUNT = 5;

const CHAPTER_TITLES = [
    "Introduction",
    "Literature Review",
    "Methodology",
    "Implementation",
    "Conclusion",
];

// Only a chapter the student has actually handed in can be reviewed.
const REVIEWABLE_CHAPTER_STATUSES = new Set(["submitted", "under_review"]);

const withChapterAvailability = (chapters) => {
    const ordered = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
    return ordered.map((chapter, index) => ({
        ...chapter,
        unlocked: index === 0 || ordered[index - 1].status === "approved",
    }));
};

const findChapter = async (chapterId) => {
    const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", chapterId)
        .maybeSingle();
    if (error) throw error;
    return data ?? null;
};

const findStudentProject = async (studentId) => {
    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("studentId", studentId)
        .maybeSingle();
    if (error) throw error;
    return data ?? null;
};

const listChapters = (projectId) =>
    fetchRows("chapters", (query) =>
        query.eq("projectId", projectId).order("chapterNumber", { ascending: true }),
    );

const listChapterComments = async (chapterIds) => {
    if (!chapterIds.length) return [];

    const { data, error } = await supabase
        .from("chapter_comments")
        .select("*")
        .in("chapterId", chapterIds)
        .order("createdAt", { ascending: true });
    if (error) throw error;
    return data ?? [];
};

// Chapter rows are created on first read, so chapter 1 exists as soon as the
// student has a project and nothing has to be backfilled later.
const ensureChaptersForStudent = async (studentId) => {
    const project = await findStudentProject(studentId);
    if (!project) return [];

    const existing = await listChapters(project.id);
    const missing = [];

    for (let chapterNumber = 1; chapterNumber <= CHAPTER_COUNT; chapterNumber += 1) {
        if (!existing.some((chapter) => chapter.chapterNumber === chapterNumber)) {
            missing.push({
                projectId: project.id,
                studentId,
                chapterNumber,
                title: `Chapter ${chapterNumber} — ${CHAPTER_TITLES[chapterNumber - 1]}`,
                status: "not_started",
            });
        }
    }

    if (missing.length) {
        const { error } = await supabase.from("chapters").insert(missing);
        if (error) throw error;
    }

    return listChapters(project.id);
};

// Flips Chapter 1 from untouched to in progress. Guarded on the stored status, so a
// resubmitted proposal, a second tab or the portal's self-heal cannot pull a chapter
// that is already under way backwards. Returns whether this call was the one that
// opened it, which is what tells the caller whether the project row still needs moving.
const openChapterOne = async ({ chapterId, studentId }) => {
    const now = new Date().toISOString();
    const { data: started, error } = await supabase
        .from("chapters")
        .update({ status: "in_progress", updatedAt: now })
        .eq("id", chapterId)
        .eq("status", "not_started") // two concurrent submissions must not both win
        .select()
        .maybeSingle();
    if (error) throw error;
    if (!started) return false;

    await safeSideEffect("chapter 1 started activity", () =>
        createActivity({
            userId: studentId,
            type: "chapter_started",
            title: "Chapter 1 started",
            body: "Your proposal was submitted and Chapter 1 is now open. Upload your draft when you are ready.",
            tone: "indigo",
        }),
    );

    return true;
};

// Creates the student's project if it does not exist yet and opens Chapter 1.
// Idempotent by design: a student may resubmit a proposal at any time, and a
// resubmission must never pull an already-open chapter backwards.
const startFirstChapter = async ({ studentId, title }) => {
    // Nothing else in the app creates a project, so this may be the first one.
    let project = await findStudentProject(studentId);
    if (!project) {
        const { data, error } = await supabase
            .from("projects")
            .insert({ studentId, title: title || "Final Year Project" })
            .select()
            .single();
        if (error) throw error;
        project = data;
    }

    const chapters = await ensureChaptersForStudent(studentId);
    const first = chapters.find((chapter) => chapter.chapterNumber === 1);
    if (!first || first.status !== "not_started") return null;

    if (!(await openChapterOne({ chapterId: first.id, studentId }))) return null;

    // The project row moves only once the chapter really opened, so the stage can
    // never run ahead of the work. The value comes from the shared timeline, which
    // is what the portal read would have derived anyway.
    const index = PROJECT_STAGE_INDEX.chapterWriting;
    const { data: updated, error: projectError } = await supabase
        .from("projects")
        .update({
            stage: PROJECT_TIMELINE[index],
            status: PROJECT_STATUS.chapterWriting,
            progress: progressForStage(index),
        })
        .eq("id", project.id)
        .select()
        .maybeSingle();
    if (projectError) throw projectError;

    return updated ?? project;
};

// Re-derives a project's stage from the records themselves and stores the result, so
// what a portal shows is what the data actually supports.
//
// This is the whole point of the timeline being derived: a value that fell behind can
// only be corrected by a write, and tying that write to a read means a refresh is
// enough to fix it. Callers run it inside their own try/catch — a project whose stage
// could not be refreshed should still render with the value it already had.
const syncProjectStage = async ({ project, chapters, proposal, supervisorAssigned = false }) => {
    if (!project) return project;

    const derived = deriveProjectStage({ project, chapters, proposal, supervisorAssigned });
    if (!derived) return project;

    const unchanged =
        project.stage === derived.stage &&
        project.status === derived.status &&
        project.progress === derived.progress;
    if (unchanged) return project;

    const { data, error } = await supabase
        .from("projects")
        .update({ stage: derived.stage, status: derived.status, progress: derived.progress })
        .eq("id", project.id)
        .select()
        .maybeSingle();
    if (error) {
        console.warn(`[portal] project stage persistence failed for ${project.id}: ${error.message}`);
        return { ...project, ...derived };
    }

    // `.maybeSingle()` answers with no row if the project was deleted in between; the
    // caller keeps the row it already had rather than being handed a null.
    return (
        data ?? {
            ...project,
            stage: derived.stage,
            status: derived.status,
            progress: derived.progress,
        }
    );
};

// An empty chapter list means the chapter read failed rather than that the student has
// no chapters — `ensureChaptersForStudent` creates all five whenever the table is
// readable. Deriving from nothing there would write a lower stage than the truth, so
// the write-back is skipped and the stored value left alone.
const hasChapterRows = (chapters) => Array.isArray(chapters) && chapters.length > 0;

const syncProjectsForPortal = async ({ projects, chapters, proposals, assignedStudentIds }) =>
    Promise.all(
        projects.map(async (project) => {
            const studentChapters = chapters.filter(
                (chapter) => chapter.studentId === project.studentId,
            );
            if (!hasChapterRows(studentChapters)) return project;

            const proposal =
                proposals.find((entry) => entry.studentId === project.studentId) ?? null;
            const supervisorAssigned = assignedStudentIds.has(project.studentId);

            try {
                return await syncProjectStage({
                    project,
                    chapters: studentChapters,
                    proposal,
                    supervisorAssigned,
                });
            } catch (error) {
                console.warn(`[portal] stage for project ${project.id} unavailable: ${error.message}`);
                const derived = deriveProjectStage({
                    project,
                    chapters: studentChapters,
                    proposal,
                    supervisorAssigned,
                });
                return derived ? { ...project, ...derived } : project;
            }
        }),
    );

// Students who submitted a proposal before this workflow existed have no project
// row, so nothing ever created their chapters. The portal read heals them with the
// same path the proposal route uses; it costs one extra query and only does work
// while the student still has no project.
//
// `project` is returned unchanged when there is nothing to start, so a caller that
// already had one never loses it to a null.
const healUnstartedStudent = async (studentId, project = null) => {
    const { data: proposal, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("studentId", studentId)
        .maybeSingle();
    if (error) throw error;
    if (!isSubmittedProposal(proposal)) return project;

    await startFirstChapter({ studentId, title: proposal.title });
    return (await findStudentProject(studentId)) ?? project;
};

// Hands each chapter its own comment trail and its derived lock state.
const decorateChapters = async (chapters) => {
    const comments = await listChapterComments(chapters.map((chapter) => chapter.id));
    return withChapterAvailability(
        chapters.map((chapter) => ({
            ...chapter,
            comments: comments.filter((comment) => comment.chapterId === chapter.id),
        })),
    );
};

// The portal read degrades like the topic/proposal ones do, so a database that
// has not had the chapter schema applied yet still renders the rest of the page.
const loadPortalChapters = async (studentId, project) => {
    if (!project) return [];

    try {
        return await decorateChapters(await ensureChaptersForStudent(studentId));
    } catch (error) {
        console.warn(`[portal] chapters unavailable: ${error.message}`);
        return [];
    }
};

// Returns the chapter when the caller owns it and it is open for work, otherwise
// returns the status and message the route should answer with.
const resolveOpenChapter = async (chapterId, studentId) => {
    const chapter = await findChapter(chapterId);
    if (!chapter) {
        return { denied: { status: 404, message: "Chapter not found" } };
    }

    if (chapter.studentId !== studentId) {
        return { denied: { status: 403, message: "This chapter is not yours" } };
    }

    const chapters = withChapterAvailability(await listChapters(chapter.projectId));
    const open = chapters.find((entry) => entry.id === chapter.id);

    if (!open.unlocked) {
        return {
            denied: {
                status: 403,
                message: `Chapter ${chapter.chapterNumber} is locked until chapter ${chapter.chapterNumber - 1} has been approved`,
            },
        };
    }

    return { chapter, chapters };
};

const getPortalData = async (user) => {
    const topics = await fetchRows("project_topics", (query) =>
        query.order("createdAt", { ascending: false }),
    );

    if (user.role === "student") {
        const projects = await fetchRows("projects", (query) =>
            query.eq("studentId", user.id).limit(1),
        );
        let project = projects[0] ?? null;

        // Self-heal: a student whose proposal predates this workflow has no project
        // row at all, so nothing ever created one. Same path the proposal route uses,
        // and it degrades like the other portal reads so a missing proposals table
        // cannot take the rest of the page down.
        if (!project) {
            try {
                project = await healUnstartedStudent(user.id, null);
            } catch (error) {
                console.warn(`[portal] project self-heal unavailable: ${error.message}`);
            }
        }

        const [loadedChapters, meetings, defenses, messages, supervisorRequest, topic, proposal] = await Promise.all([
            loadPortalChapters(user.id, project),
            fetchRows("meetings", (query) => query.eq("studentId", user.id).order("scheduledAt", { ascending: true })),
            fetchRows("defenses", (query) => query.eq("studentId", user.id).order("scheduledAt", { ascending: true })),
            fetchRows("messages", (query) =>
                query.or(`senderId.eq.${user.id},recipientId.eq.${user.id}`).order("createdAt", { ascending: false }),
            ),
            getActiveSupervisorRequest(user.id),
            getStudentTopicSafe(user.id),
            getStudentProposalSafe(user.id),
        ]);
        let chapters = loadedChapters;

        // Submitting a proposal is what opens Chapter 1. A start interrupted halfway
        // leaves the project without it, and that used to be caught by the stage still
        // reading 'proposal' — a signal that no longer exists now the stage is derived
        // from the records. The chapter row says the same thing and cannot go stale, so
        // it is what decides here. Retried on every read until it lands.
        const chapterOne = chapters.find((chapter) => chapter.chapterNumber === 1);
        if (project && chapterOne?.status === "not_started" && isSubmittedProposal(proposal)) {
            try {
                await openChapterOne({ chapterId: chapterOne.id, studentId: user.id });
                chapters = await loadPortalChapters(user.id, project);
            } catch (error) {
                console.warn(`[portal] chapter 1 self-heal unavailable: ${error.message}`);
            }
        }

        // Every read re-derives the stage from the records and stores the result, so a
        // refresh always shows the stage the data supports rather than whichever write
        // last happened to move it.
        if (project && hasChapterRows(chapters)) {
            try {
                project = await syncProjectStage({
                    project,
                    chapters,
                    proposal,
                    supervisorAssigned: supervisorRequest?.status === "assigned",
                });
            } catch (error) {
                console.warn(`[portal] project stage unavailable: ${error.message}`);
            }
        }

        return { role: user.role, project, topics, chapters, meetings, defenses, messages, topic, proposal, supervisorRequest: await getSupervisorRequestDetails(supervisorRequest) };
    }

    if (user.role === "supervisor") {
        const assignments = await fetchRows("supervisor_requests", (query) =>
            query.eq("supervisorId", user.id).eq("status", "assigned"),
        );
        const studentIds = [...new Set(
            assignments
                .map((assignment) => assignment.studentId)
                .filter((studentId) => studentId !== null && studentId !== undefined && studentId !== ""),
        )];
        const [projects, reviews, meetings, students, messages, studentTopics, proposals, chapters] = await Promise.all([
            studentIds.length ? fetchRows("projects", (query) => query.in("studentId", studentIds)) : [],
            fetchRows("reviews", (query) => query.eq("supervisorId", user.id).order("submittedAt", { ascending: false })),
            fetchRows("meetings", (query) => query.eq("supervisorId", user.id).order("scheduledAt", { ascending: true })),
            studentIds.length ? fetchRows("users", (query) => query.in("id", studentIds)) : [],
            fetchRows("messages", (query) =>
                query.or(`senderId.eq.${user.id},recipientId.eq.${user.id}`).order("createdAt", { ascending: false }),
            ),
            studentIds.length
                ? fetchRowsSafe("student_topics", (query) => query.in("studentId", studentIds).order("submittedAt", { ascending: false }))
                : [],
            studentIds.length
                ? fetchRowsSafe("proposals", (query) => query.in("studentId", studentIds).order("updatedAt", { ascending: false }))
                : [],
            studentIds.length
                ? fetchRowsSafe("chapters", (query) => query.in("studentId", studentIds))
                : [],
        ]);

        // The supervisor sees the same derived stage the student does, so their lists
        // are refreshed from the records before they are handed over. Every student
        // here is on the list because their request is assigned, which is the only
        // part of the derivation the rows themselves do not carry. A student whose
        // stage could not be refreshed keeps the stored value rather than losing it.
        const syncedProjects = await syncProjectsForPortal({
            projects,
            chapters,
            proposals,
            assignedStudentIds: new Set(studentIds),
        });

        return {
            role: user.role,
            students: students.map(normalizeUser),
            projects: syncedProjects,
            reviews,
            meetings,
            messages,
            topics,
            studentTopics: await Promise.all(studentTopics.map(withStudent)),
            proposals,
        };
    }

    const [students, supervisors, pendingRequests, projects, defenses, studentUsers, supervisorUsers, projectRows, defenseRows, topicRows, proposalRows, assignedRequests] = await Promise.all([
        fetchCount("users", (query) => query.eq("role", "student")),
        fetchCount("users", (query) => query.eq("role", "supervisor")),
        fetchCount("supervisor_requests", (query) => query.eq("status", "pending")),
        fetchCount("projects"),
        fetchCount("defenses", (query) => query.not("status", "eq", "unscheduled")),
        fetchRows("users", (query) => query.eq("role", "student").order("createdAt", { ascending: false })),
        fetchRows("users", (query) => query.eq("role", "supervisor").order("createdAt", { ascending: false })),
        fetchRows("projects", (query) => query.order("createdAt", { ascending: false })),
        fetchRows("defenses", (query) => query.order("scheduledAt", { ascending: true })),
        fetchRowsSafe("student_topics", (query) => query.order("submittedAt", { ascending: false })),
        fetchRowsSafe("proposals", (query) => query.order("updatedAt", { ascending: false })),
        fetchRowsSafe("supervisor_requests", (query) => query.eq("status", "assigned")),
    ]);
    const projectStudentIds = [...new Set(projectRows.map((project) => project.studentId))];
    const chapterRows = projectStudentIds.length
        ? await fetchRowsSafe("chapters", (query) => query.in("studentId", projectStudentIds))
        : [];
    const syncedProjectRows = await syncProjectsForPortal({
        projects: projectRows,
        chapters: chapterRows,
        proposals: proposalRows,
        assignedStudentIds: new Set(assignedRequests.map((request) => request.studentId)),
    });
    return {
        role: user.role,
        stats: { students, supervisors, pendingRequests, projects, defenses },
        students: studentUsers.map(normalizeUser),
        supervisors: supervisorUsers.map(normalizeUser),
        projects: syncedProjectRows,
        defenses: defenseRows,
        topics,
        studentTopics: await Promise.all(topicRows.map(withStudent)),
        proposals: proposalRows,
    };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// Fixed-window limiter, in memory. Fine for a single instance; a multi-instance
// deployment would need a shared store (Redis) instead.
//
// Deliberately keyed on IP *and* the submitted email: behind a proxy every
// request can share one IP, and a per-IP-only limit would then let one attacker
// lock out the whole institution.
const createRateLimiter = ({ windowMs, max, message, keyFrom }) => {
    const hits = new Map();

    return (req, res, next) => {
        const now = Date.now();

        // Drop expired buckets so the map cannot grow without bound.
        if (hits.size > 5000) {
            for (const [key, entry] of hits) {
                if (entry.expiresAt <= now) hits.delete(key);
            }
        }

        const key = keyFrom(req);
        const entry = hits.get(key);

        if (!entry || entry.expiresAt <= now) {
            hits.set(key, { count: 1, expiresAt: now + windowMs });
            return next();
        }

        entry.count += 1;
        if (entry.count > max) {
            res.set("Retry-After", String(Math.ceil((entry.expiresAt - now) / 1000)));
            return res.status(429).json({ message });
        }

        next();
    };
};

const identifiersFromBody = (field) => (req) => {
    const value = req.body?.[field];
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
    return `${req.ip ?? "unknown"}|${normalized}`;
};

const ipOnly = (req) => req.ip ?? "unknown";

const loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many sign-in attempts. Please wait a few minutes and try again.",
    keyFrom: identifiersFromBody("email"),
});

// Keyed on the address alone: keying on IP + email would let someone create any
// number of accounts simply by varying the email each time.
const registerRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: "Too many accounts created from this address. Please try again later.",
    keyFrom: ipOnly,
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", registerRateLimiter, async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, department, studentId, staffId } = req.body ?? {};
        const validRoles = new Set(["student", "supervisor", "coordinator"]);

        if (!validRoles.has(role)) {
            return res.status(400).json({ message: "Invalid user role" });
        }

        const trimmedFirstName = typeof firstName === "string" ? firstName.trim() : "";
        const trimmedLastName = typeof lastName === "string" ? lastName.trim() : "";
        const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        const trimmedDepartment = typeof department === "string" ? department.trim() : "";
        const isStudent = role === "student";
        const rawIdentifier = isStudent ? studentId : staffId;
        const identifier = typeof rawIdentifier === "string" ? rawIdentifier.trim() : "";
        const identifierLabel = isStudent ? "Student ID" : "Staff ID";

        if (!trimmedFirstName || !trimmedLastName) {
            return res.status(400).json({ message: "First name and last name are required" });
        }
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            return res.status(400).json({ message: "A valid email address is required" });
        }
        if (!trimmedDepartment) {
            return res.status(400).json({ message: "Department is required" });
        }
        if (!identifier) {
            return res.status(400).json({ message: `${identifierLabel} is required` });
        }
        if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
        }
        if (password.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` });
        }

        const existingUser = await findUserByEmail(trimmedEmail);
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await createUser({
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            email: trimmedEmail,
            password: hashedPassword,
            role,
            department: trimmedDepartment,
            studentId: isStudent ? identifier : null,
            staffId: isStudent ? null : identifier,
        });

        await createActivity({
            userId: user.id,
            type: "account_created",
            title: "Welcome to ThesisHub",
            body: "Your project workspace is ready to personalise.",
            tone: "indigo",
        });

        const token = createToken(user);
        res.status(201).json({ token, user: normalizeUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/auth/login", loginRateLimiter, async (req, res) => {
    try {
        const { email, password } = req.body ?? {};
        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Emails are stored lower-cased at registration, so match that here.
        const user = await findUserByEmail(email.trim().toLowerCase());
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = createToken(user);
        res.json({ token, user: normalizeUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
        const user = await findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user: normalizeUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logged out" });
});

app.get("/api/documents", authenticateToken, async (req, res) => {
    try {
        const documents = await listDocumentsForUser(req.user.id);
        res.json({ documents: documents.map(normalizeDocument) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/api/activities", authenticateToken, async (req, res) => {
    try {
        const activities = await listActivitiesForUser(req.user.id);
        res.json({ activities });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/api/portal/data", authenticateToken, async (req, res) => {
    try {
        res.json({ data: await getPortalData(req.user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/api/users", authenticateToken, requireRole("coordinator"), async (req, res) => {
    try {
        const role = req.query.role;
        const query = supabase
            .from("users")
            .select("*")
            .order("createdAt", { ascending: false });
        const { data, error } = role ? await query.eq("role", role) : await query;
        if (error) throw error;
        res.json({ users: data.map(normalizeUser) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/api/supervisor-requests", authenticateToken, async (req, res) => {
    try {
        if (req.user.role === "coordinator") {
            const { data, error } = await supabase
                .from("supervisor_requests")
                .select("*")
                .order("requestedAt", { ascending: false });
            if (error) throw error;

            const requests = await Promise.all(data.map(getSupervisorRequestDetails));
            return res.json({ requests });
        }

        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Only students can view their request" });
        }

        const request = await getActiveSupervisorRequest(req.user.id);
        res.json({ request: await getSupervisorRequestDetails(request) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/supervisor-requests", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const existingRequest = await getActiveSupervisorRequest(req.user.id);
        if (existingRequest) {
            return res.status(409).json({ message: "You already have an active supervisor request" });
        }

        const { data: request, error } = await supabase
            .from("supervisor_requests")
            .insert({
                studentId: req.user.id,
                message: typeof req.body.message === "string" ? req.body.message.trim() : null,
            })
            .select()
            .single();
        if (error) throw error;

        await createActivity({
            userId: req.user.id,
            type: "supervisor_request_submitted",
            title: "Supervisor request submitted",
            body: "Your request is waiting for coordinator assignment.",
            tone: "amber",
        });

        const { data: coordinators, error: coordinatorError } = await supabase
            .from("users")
            .select("id")
            .eq("role", "coordinator");
        if (coordinatorError) throw coordinatorError;
        if (coordinators.length) {
            await supabase.from("activities").insert(
                coordinators.map((coordinator) => ({
                    userId: coordinator.id,
                    type: "supervisor_request_received",
                    title: "New supervisor request",
                    body: "A student is waiting for supervisor assignment.",
                    tone: "amber",
                })),
            );
        }

        res.status(201).json({ request: await getSupervisorRequestDetails(request) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/supervisor-requests/:requestId/assign", authenticateToken, requireRole("coordinator"), async (req, res) => {
    try {
        const { supervisorId } = req.body;
        const supervisor = await findUserById(supervisorId);
        if (!supervisor || supervisor.role !== "supervisor") {
            return res.status(400).json({ message: "A valid supervisor is required" });
        }

        const { data: currentRequest, error: requestError } = await supabase
            .from("supervisor_requests")
            .select("*")
            .eq("id", req.params.requestId)
            .maybeSingle();
        if (requestError) throw requestError;
        if (!currentRequest || currentRequest.status !== "pending") {
            return res.status(409).json({ message: "This request is no longer pending" });
        }

        const { data: request, error } = await supabase
            .from("supervisor_requests")
            .update({
                supervisorId,
                status: "assigned",
                assignedAt: new Date().toISOString(),
                assignedBy: req.user.id,
            })
            .eq("id", currentRequest.id)
            .select()
            .single();
        if (error) throw error;

        await supabase.from("activities").insert([
            {
                userId: request.studentId,
                type: "supervisor_assigned",
                title: "Supervisor assigned",
                body: `${supervisor.firstName || supervisor.email} is now assigned to your project.`,
                tone: "emerald",
            },
            {
                userId: supervisorId,
                type: "student_assigned",
                title: "Student assigned",
                body: "A new student has been assigned to your supervision queue.",
                tone: "indigo",
            },
        ]);

        res.json({ request: await getSupervisorRequestDetails(request) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// A document is reachable by whoever uploaded it, the supervisor assigned to
// that student, and any coordinator.
const canAccessDocument = async (requester, document) => {
    if (document.uploadedBy === requester.id) return true;
    if (requester.role === "coordinator") return true;
    if (requester.role !== "supervisor") return false;

    const { data, error } = await supabase
        .from("supervisor_requests")
        .select("id")
        .eq("studentId", document.uploadedBy)
        .eq("supervisorId", requester.id)
        .eq("status", "assigned")
        .maybeSingle();
    if (error) throw error;
    return Boolean(data);
};

app.post(
    "/api/documents/upload",
    authenticateToken,
    (req, res, next) => {
        // Run multer by hand so its rejections become a 400 with a usable
        // message instead of falling through to Express's HTML 500 page.
        upload.single("file")(req, res, (error) => {
            if (!error) return next();
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "This file is larger than the 20MB limit"
                : error.message;
            return res.status(400).json({ message });
        });
    },
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            const document = await createDocumentRecord({
                filename: req.file.filename,
                originalName: path.basename(req.file.originalname),
                mimeType: req.file.mimetype,
                size: req.file.size,
                path: req.file.path,
                uploadedBy: req.user.id,
            });

            await createActivity({
                userId: req.user.id,
                type: "document_uploaded",
                title: "Document uploaded",
                body: `${req.file.originalname} was added to your project workspace.`,
                tone: "emerald",
            });

            res.status(201).json({ document: normalizeDocument(document), message: "File uploaded successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
);

app.get("/api/student-topics", authenticateToken, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.json({ topic: await getStudentTopic(req.user.id) });
        }

        if (req.user.role === "supervisor") {
            const studentIds = await listAssignedStudentIds(req.user.id);
            if (!studentIds.length) return res.json({ topics: [] });

            const { data, error } = await supabase
                .from("student_topics")
                .select("*")
                .in("studentId", studentIds)
                .order("submittedAt", { ascending: false });
            if (error) throw error;
            return res.json({ topics: await Promise.all(data.map(withStudent)) });
        }

        if (req.user.role === "coordinator") {
            const { data, error } = await supabase
                .from("student_topics")
                .select("*")
                .order("submittedAt", { ascending: false });
            if (error) throw error;
            return res.json({ topics: await Promise.all(data.map(withStudent)) });
        }

        return res.status(403).json({ message: "Insufficient permissions" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/student-topics", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
        if (!title) {
            return res.status(400).json({ message: "A project topic is required" });
        }

        const existing = await getStudentTopic(req.user.id);
        if (existing?.status === "accepted") {
            return res.status(409).json({ message: "Your topic has already been accepted" });
        }
        if (existing?.status === "pending") {
            return res.status(409).json({ message: "Your topic is already awaiting review" });
        }

        const payload = {
            title,
            status: "pending",
            declineReason: null,
            submittedAt: new Date().toISOString(),
            reviewedAt: null,
            reviewedBy: null,
        };

        const { data: topic, error } = existing
            ? await supabase
                .from("student_topics")
                .update(payload)
                .eq("id", existing.id)
                .select()
                .single()
            : await supabase
                .from("student_topics")
                .insert({ ...payload, studentId: req.user.id })
                .select()
                .single();
        if (error) throw error;

        await safeSideEffect("topic activity", () =>
            createActivity({
                userId: req.user.id,
                type: "topic_submitted",
                title: existing ? "Revised topic submitted" : "Topic submitted",
                body: "Your project topic is waiting for supervisor review.",
                tone: "amber",
            }),
        );

        await safeSideEffect("topic notification", () =>
            notifyStudentSupervisor(req.user.id, {
                type: "topic_submitted",
                title: "Topic awaiting review",
                body: "A student submitted a project topic for your review.",
                tone: "amber",
            }),
        );

        res.status(existing ? 200 : 201).json({ topic });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const reviewStudentTopic = async (req, res, status, reason) => {
    try {
        const { data: topic, error } = await supabase
            .from("student_topics")
            .select("*")
            .eq("id", req.params.topicId)
            .maybeSingle();
        if (error) throw error;
        if (!topic) {
            return res.status(404).json({ message: "Topic not found" });
        }
        if (topic.status !== "pending") {
            return res.status(409).json({ message: `This topic has already been ${topic.status}` });
        }

        const allowed = await canReviewStudent(req.user, topic.studentId);
        if (!allowed) {
            return res.status(403).json({ message: "You are not assigned to this student" });
        }

        const { data: updated, error: updateError } = await supabase
            .from("student_topics")
            .update({
                status,
                declineReason: reason || null,
                reviewedAt: new Date().toISOString(),
                reviewedBy: req.user.id,
            })
            .eq("id", topic.id)
            .select()
            .single();
        if (updateError) throw updateError;

        await safeSideEffect("topic review activity", () =>
            createActivity({
                userId: topic.studentId,
                type: `topic_${status}`,
                title: status === "accepted" ? "Topic accepted" : "Topic declined",
                body:
                    status === "accepted"
                        ? "Your topic was accepted. You can now submit your proposal."
                        : reason
                            ? `Your topic was declined: ${reason}`
                            : "Your topic was declined. You can submit a revised topic.",
                tone: status === "accepted" ? "emerald" : "amber",
            }),
        );

        res.json({ topic: await withStudent(updated) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

app.post("/api/student-topics/:topicId/accept", authenticateToken, requireAnyRole("supervisor", "coordinator"), (req, res) =>
    reviewStudentTopic(req, res, "accepted"),
);

app.post("/api/student-topics/:topicId/decline", authenticateToken, requireAnyRole("supervisor", "coordinator"), (req, res) => {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() || null : null;
    return reviewStudentTopic(req, res, "declined", reason);
});

app.get("/api/proposals", authenticateToken, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.json({ proposal: await getStudentProposal(req.user.id) });
        }

        if (req.user.role === "supervisor") {
            const studentIds = await listAssignedStudentIds(req.user.id);
            if (!studentIds.length) return res.json({ proposals: [] });

            const { data, error } = await supabase
                .from("proposals")
                .select("*")
                .in("studentId", studentIds)
                .order("updatedAt", { ascending: false });
            if (error) throw error;
            return res.json({ proposals: await Promise.all(data.map(withStudent)) });
        }

        if (req.user.role === "coordinator") {
            const { data, error } = await supabase
                .from("proposals")
                .select("*")
                .order("updatedAt", { ascending: false });
            if (error) throw error;
            return res.json({ proposals: await Promise.all(data.map(withStudent)) });
        }

        return res.status(403).json({ message: "Insufficient permissions" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/proposals", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        // Server-side enforcement: a proposal can only be submitted after the topic is accepted.
        const topic = await getStudentTopic(req.user.id);
        if (topic?.status !== "accepted") {
            return res.status(403).json({
                message: "Your topic must be accepted before you can submit a proposal",
            });
        }

        const title = typeof req.body.title === "string" && req.body.title.trim()
            ? req.body.title.trim()
            : topic.title;
        const description = typeof req.body.description === "string" ? req.body.description.trim() || null : null;
        const documentId = req.body.documentId || null;

        const payload = {
            title,
            description,
            documentId,
            status: "submitted",
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const { data: proposal, error } = await supabase
            .from("proposals")
            .upsert({ ...payload, studentId: req.user.id }, { onConflict: "studentId" })
            .select()
            .single();
        if (error) throw error;

        await safeSideEffect("proposal activity", () =>
            createActivity({
                userId: req.user.id,
                type: "proposal_submitted",
                title: "Proposal submitted",
                body: `${title} is now waiting for review.`,
                tone: "indigo",
            }),
        );

        await safeSideEffect("proposal notification", () =>
            notifyStudentSupervisor(req.user.id, {
                type: "proposal_submitted",
                title: "Proposal awaiting review",
                body: "A student submitted a project proposal for your review.",
                tone: "indigo",
            }),
        );

        // Only after the proposal write has succeeded: a failed submission must never
        // leave a half-started project behind. A failure here is logged rather than
        // returned, because the proposal itself is already saved — reporting 500 would
        // tell the student their proposal failed when it did not. The portal read
        // self-heals the start on their next load.
        try {
            await startFirstChapter({ studentId: req.user.id, title });
        } catch (startError) {
            console.error(`[proposal] chapter 1 auto-start failed: ${startError.message}`);
        }

        res.status(201).json({ proposal });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Meeting requests: a student asks their assigned supervisor for a meeting and
// the supervisor accepts or declines. No route trusts a student or supervisor id
// sent by the client — the relationship is always re-read from supervisor_requests.
app.get("/api/meeting-requests", authenticateToken, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.json({ meetingRequests: await listMeetingRequestsForStudent(req.user.id) });
        }

        if (req.user.role === "supervisor") {
            return res.json({ meetingRequests: await listMeetingRequestsForSupervisor(req.user.id) });
        }

        return res.status(403).json({ message: "Insufficient permissions" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/meeting-requests", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const supervisorId = await getAssignedSupervisorId(req.user.id);
        if (!supervisorId) {
            return res.status(403).json({ message: "You must have an assigned supervisor before requesting a meeting." });
        }

        const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
        const date = typeof req.body.date === "string" ? req.body.date.trim() : "";
        const time = typeof req.body.time === "string" ? req.body.time.trim() : "";
        const mode = typeof req.body.mode === "string" && req.body.mode.trim() ? req.body.mode.trim() : "in-person";
        const location = typeof req.body.location === "string" ? req.body.location.trim() || null : null;
        const message = typeof req.body.message === "string" ? req.body.message.trim() || null : null;

        if (!title) {
            return res.status(400).json({ message: "A meeting title or reason is required" });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ message: "A preferred date is required" });
        }
        if (!time) {
            return res.status(400).json({ message: "A preferred time is required" });
        }
        if (!MEETING_MODES.has(mode)) {
            return res.status(400).json({ message: "Meeting mode must be in-person or online" });
        }

        const now = new Date().toISOString();
        const { data: meetingRequest, error } = await supabase
            .from("meeting_requests")
            .insert({
                studentId: req.user.id,
                supervisorId,
                title,
                date,
                time,
                mode,
                location,
                message,
                status: "pending",
                createdAt: now,
                updatedAt: now,
            })
            .select()
            .single();
        if (error) throw error;

        await safeSideEffect("meeting request activity", () =>
            createActivity({
                userId: req.user.id,
                type: "meeting_requested",
                title: "Meeting requested",
                body: `Your request "${title}" for ${describeMeetingWhen(meetingRequest)} was sent to your supervisor.`,
                tone: "amber",
            }),
        );

        await safeSideEffect("meeting request notification", () =>
            createActivity({
                userId: supervisorId,
                type: "meeting_requested",
                title: "New meeting request",
                body: `A student asked to meet on ${describeMeetingWhen(meetingRequest)}: ${title}.`,
                tone: "amber",
            }),
        );

        res.status(201).json({ meetingRequest });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/meeting-requests/:requestId/cancel", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const meetingRequest = await findMeetingRequest(req.params.requestId);
        if (!meetingRequest) {
            return res.status(404).json({ message: "Meeting request not found" });
        }
        if (meetingRequest.studentId !== req.user.id) {
            return res.status(403).json({ message: "This meeting request is not yours" });
        }
        if (meetingRequest.status !== "pending") {
            return res.status(409).json({ message: `This meeting request has already been ${meetingRequest.status}` });
        }

        const { data: updated, error } = await supabase
            .from("meeting_requests")
            .update({ status: "cancelled", updatedAt: new Date().toISOString() })
            .eq("id", meetingRequest.id)
            .select()
            .single();
        if (error) throw error;

        await safeSideEffect("meeting cancel notification", () =>
            createActivity({
                userId: updated.supervisorId,
                type: "meeting_cancelled",
                title: "Meeting request cancelled",
                body: `A student cancelled their meeting request for ${describeMeetingWhen(updated)}.`,
                tone: "amber",
            }),
        );

        res.json({ meetingRequest: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const respondToMeetingRequest = async (req, res, status) => {
    try {
        const meetingRequest = await findMeetingRequest(req.params.requestId);
        if (!meetingRequest) {
            return res.status(404).json({ message: "Meeting request not found" });
        }

        const allowed = await canReviewStudent(req.user, meetingRequest.studentId);
        if (!allowed) {
            return res.status(403).json({ message: "This student is not assigned to you" });
        }
        if (meetingRequest.status !== "pending") {
            return res.status(409).json({ message: `This meeting request has already been ${meetingRequest.status}` });
        }

        const body = req.body ?? {};
        const rawResponse = typeof body.responseMessage === "string" ? body.responseMessage : body.reason;
        const responseMessage = typeof rawResponse === "string" ? rawResponse.trim() || null : null;

        const { data: updated, error } = await supabase
            .from("meeting_requests")
            .update({
                status,
                responseMessage,
                respondedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .eq("id", meetingRequest.id)
            .select()
            .single();
        if (error) throw error;

        const accepted = status === "accepted";
        await safeSideEffect("meeting response activity", () =>
            createActivity({
                userId: updated.studentId,
                type: accepted ? "meeting_accepted" : "meeting_declined",
                title: accepted ? "Meeting request accepted" : "Meeting request declined",
                body: accepted
                    ? `Your supervisor accepted your meeting request for ${describeMeetingWhen(updated)}.${responseMessage ? ` ${responseMessage}` : ""}`
                    : `Your supervisor declined your meeting request for ${describeMeetingWhen(updated)}.${responseMessage ? ` Reason: ${responseMessage}` : ""}`,
                tone: accepted ? "emerald" : "amber",
            }),
        );

        // The supervisor list renders the student, so keep it attached to the response.
        res.json({ meetingRequest: await withStudent(updated) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

app.post("/api/meeting-requests/:requestId/accept", authenticateToken, requireRole("supervisor"), (req, res) =>
    respondToMeetingRequest(req, res, "accepted"),
);

app.post("/api/meeting-requests/:requestId/decline", authenticateToken, requireRole("supervisor"), (req, res) =>
    respondToMeetingRequest(req, res, "declined"),
);

// --- Message routes ----------------------------------------------------------

// One thread, oldest first. Read as two plain filtered queries rather than a
// single nested or(and(...)) filter: the result is the same and a plain equality
// filter is far harder to get subtly wrong.
app.get("/api/messages", authenticateToken, async (req, res) => {
    try {
        const withId = typeof req.query.with === "string" ? req.query.with.trim() : "";
        const { partnerId, denied } = await resolveMessagePartner(req.user, withId);
        if (denied) {
            return res.status(denied.status).json({ message: denied.message });
        }

        const [sent, received] = await Promise.all([
            fetchRows("messages", (query) =>
                query.eq("senderId", req.user.id).eq("recipientId", partnerId),
            ),
            fetchRows("messages", (query) =>
                query.eq("senderId", partnerId).eq("recipientId", req.user.id),
            ),
        ]);

        res.json({ messages: mergeConversation(sent, received) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/messages", authenticateToken, async (req, res) => {
    try {
        const payload = req.body ?? {};
        const text = typeof payload.body === "string" ? payload.body.trim() : "";
        const explicitRecipient = typeof payload.recipientId === "string" ? payload.recipientId.trim() : "";

        if (!text) {
            return res.status(400).json({ message: "Write a message before sending it" });
        }
        if (text.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                message: `A message cannot be longer than ${MAX_MESSAGE_LENGTH} characters`,
            });
        }

        // A student has exactly one counterpart, so the client may omit the
        // recipient and let the server resolve it from the assignment.
        let recipientId = explicitRecipient;
        if (!recipientId && req.user.role === "student") {
            recipientId = (await getAssignedSupervisorId(req.user.id)) ?? "";
        }

        const { partnerId, denied } = await resolveMessagePartner(req.user, recipientId);
        if (denied) {
            return res.status(denied.status).json({ message: denied.message });
        }

        const { data: message, error } = await supabase
            .from("messages")
            .insert({
                senderId: req.user.id,
                recipientId: partnerId,
                body: text,
                createdAt: new Date().toISOString(),
            })
            .select()
            .single();
        if (error) throw error;

        const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
        await safeSideEffect("message activity", () =>
            createActivity({
                userId: partnerId,
                type: "message",
                title: "New message",
                body: preview,
                tone: "indigo",
            }),
        );

        res.status(201).json({ message });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Opening a thread clears its unread state for the reader only — never the
// other participant's copy.
app.post("/api/messages/read", authenticateToken, async (req, res) => {
    try {
        const withId = typeof req.body?.with === "string" ? req.body.with.trim() : "";
        const { partnerId, denied } = await resolveMessagePartner(req.user, withId);
        if (denied) {
            return res.status(denied.status).json({ message: denied.message });
        }

        const readAt = new Date().toISOString();
        const { error } = await supabase
            .from("messages")
            .update({ readAt })
            .eq("senderId", partnerId)
            .eq("recipientId", req.user.id)
            .is("readAt", null);
        if (error) throw error;

        res.json({ readAt });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- Defence day and score routes --------------------------------------------
//
// Who may write what is enforced here, never in the UI: only the assigned
// supervisor may score the report, only the coordinator may record the defence
// score or publish, and a published result is final for both.

app.get("/api/defence-schedule", authenticateToken, async (req, res) => {
    try {
        res.json({ schedule: await getCurrentDefenceSchedule() });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/defence-schedule", authenticateToken, requireRole("coordinator"), async (req, res) => {
    try {
        const payload = req.body ?? {};
        const title = typeof payload.title === "string" && payload.title.trim()
            ? payload.title.trim()
            : "Project defence";
        const scheduledDate = typeof payload.scheduledDate === "string" ? payload.scheduledDate.trim() : "";
        const startTime = typeof payload.startTime === "string" ? payload.startTime.trim() : "";
        const venue = typeof payload.venue === "string" ? payload.venue.trim() : "";
        const instructions = typeof payload.instructions === "string"
            ? payload.instructions.trim() || null
            : null;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
            return res.status(400).json({ message: "A defence date is required" });
        }
        if (!startTime) {
            return res.status(400).json({ message: "A start time is required" });
        }
        if (!venue) {
            return res.status(400).json({ message: "A venue is required" });
        }

        const previous = await getCurrentDefenceSchedule();
        const now = new Date().toISOString();

        const { data: schedule, error } = await supabase
            .from("defence_schedules")
            .insert({
                title,
                scheduledDate,
                startTime,
                venue,
                instructions,
                createdBy: req.user.id,
                publishedAt: now,
                createdAt: now,
                updatedAt: now,
            })
            .select()
            .single();
        if (error) throw error;

        // Seed before notifying: a student who opens the page straight after the
        // notification should find their result row already there.
        await safeSideEffect("defence result seeding", () => ensureDefenceResults(schedule));
        await safeSideEffect("defence notification", () =>
            notifyDefenceAudience(schedule, { updated: Boolean(previous) }),
        );

        res.status(201).json({ schedule });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/api/defence-results", authenticateToken, async (req, res) => {
    try {
        const schedule = await getCurrentDefenceSchedule();

        if (req.user.role === "student") {
            // A student only ever sees their own row, and only once it has been
            // published. This gate is here rather than in the UI.
            const result = await findDefenceResult(req.user.id);
            const results = result?.status === "published" ? [result] : [];
            return res.json({ schedule, results });
        }

        if (req.user.role === "supervisor") {
            const studentIds = await listAssignedStudentIds(req.user.id);
            if (!studentIds.length) return res.json({ schedule, results: [] });

            const results = await fetchRows("defence_results", (query) =>
                query.in("studentId", studentIds),
            );
            return res.json({ schedule, results });
        }

        if (req.user.role === "coordinator") {
            // Writes on a read: a project created after the schedule was published
            // still needs its result row before it can be scored.
            return res.json({ schedule, results: await ensureDefenceResults(schedule) });
        }

        return res.status(403).json({ message: "Insufficient permissions" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post(
    "/api/defence-results/:studentId/supervisor-score",
    authenticateToken,
    requireRole("supervisor"),
    async (req, res) => {
        try {
            const studentId = req.params.studentId;

            // The relationship is re-read, never taken from the path id.
            const allowed = await canReviewStudent(req.user, studentId);
            if (!allowed) {
                return res.status(403).json({ message: "This student is not assigned to you" });
            }

            const schedule = await getCurrentDefenceSchedule();
            if (!schedule) {
                return res.status(400).json({ message: "The defence day has not been scheduled yet" });
            }

            await ensureDefenceResults(schedule);
            const result = await findDefenceResult(studentId);
            if (!result) {
                return res.status(404).json({ message: "This student does not have a project to score yet" });
            }

            const denied = refuseIfPublished(result);
            if (denied) return res.status(denied.status).json({ message: denied.message });

            const payload = req.body ?? {};
            const breakdown = payload.breakdown && typeof payload.breakdown === "object"
                ? payload.breakdown
                : {};

            // Recomputed from the criteria rather than taken from the client, so a
            // tampered total cannot be submitted.
            const score = calculateReportScore(breakdown);
            const ceiling = Number(result.supervisorMax) || SCORE_MAX;
            if (score === null || !isWithinRange(score, ceiling)) {
                return res.status(400).json({
                    message: `Mark every criterion between 0 and ${SCORE_MAX}`,
                });
            }

            const submit = payload.submit !== false;
            const now = new Date().toISOString();

            // Whether this completes the collation is decided by the shared helper,
            // so the status stored here matches what the coordinator's screen shows.
            const settled = describeResult({
                supervisorScore: score,
                supervisorMax: result.supervisorMax,
                defenceScore: result.defenceScore,
                defenceMax: result.defenceMax,
            });

            const { data: updated, error } = await supabase
                .from("defence_results")
                .update({
                    supervisorId: req.user.id,
                    supervisorScore: score,
                    supervisorBreakdown: breakdown,
                    supervisorStatus: submit ? "submitted" : "draft",
                    supervisorSubmittedAt: submit ? now : result.supervisorSubmittedAt,
                    supervisorUpdatedAt: now,
                    status: settled.ready ? "ready" : "collecting",
                    updatedAt: now,
                })
                .eq("id", result.id)
                .select()
                .single();
            if (error) throw error;

            const firstScore = result.supervisorScore === null || result.supervisorScore === undefined;

            await safeSideEffect("score audit", () =>
                recordScoreAudit([
                    {
                        resultId: result.id,
                        studentId,
                        field: "supervisorScore",
                        oldValue: firstScore ? null : String(result.supervisorScore),
                        newValue: String(score),
                        action: firstScore ? "submitted" : "updated",
                        actorId: req.user.id,
                        actorRole: req.user.role,
                    },
                ]),
            );

            await safeSideEffect("score notification", () =>
                notifyCoordinators({
                    type: "supervisor_score_submitted",
                    title: submit ? "Supervisor score submitted" : "Supervisor score saved",
                    body: `${updated.supervisorScore}/${ceiling} — ${submit ? "ready for collation" : "saved as a draft"}.`,
                    tone: "indigo",
                }),
            );

            res.json({ result: updated });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
);

app.post(
    "/api/defence-results/:studentId/defence-score",
    authenticateToken,
    requireRole("coordinator"),
    async (req, res) => {
        try {
            const studentId = req.params.studentId;
            const result = await findDefenceResult(studentId);
            if (!result) {
                return res.status(404).json({ message: "No result found for this student" });
            }

            const denied = refuseIfPublished(result);
            if (denied) return res.status(denied.status).json({ message: denied.message });

            const ceiling = Number(result.defenceMax) || SCORE_MAX;
            const raw = req.body?.defenceScore;
            if (!isWithinRange(raw, ceiling)) {
                return res.status(400).json({ message: `A defence score between 0 and ${ceiling} is required` });
            }
            const score = Number(raw);
            const now = new Date().toISOString();

            const settled = describeResult({
                supervisorScore: result.supervisorScore,
                supervisorMax: result.supervisorMax,
                defenceScore: score,
                defenceMax: result.defenceMax,
            });

            const { data: updated, error } = await supabase
                .from("defence_results")
                .update({
                    defenceScore: score,
                    defenceRecordedBy: req.user.id,
                    defenceRecordedAt: now,
                    status: settled.ready ? "ready" : "collecting",
                    updatedAt: now,
                })
                .eq("id", result.id)
                .select()
                .single();
            if (error) throw error;

            const firstScore = result.defenceScore === null || result.defenceScore === undefined;

            await safeSideEffect("score audit", () =>
                recordScoreAudit([
                    {
                        resultId: result.id,
                        studentId,
                        field: "defenceScore",
                        oldValue: firstScore ? null : String(result.defenceScore),
                        newValue: String(score),
                        action: firstScore ? "recorded" : "updated",
                        actorId: req.user.id,
                        actorRole: req.user.role,
                    },
                ]),
            );

            res.json({ result: updated });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
);

app.post(
    "/api/defence-results/:studentId/publish",
    authenticateToken,
    requireRole("coordinator"),
    async (req, res) => {
        try {
            const studentId = req.params.studentId;
            const result = await findDefenceResult(studentId);
            if (!result) {
                return res.status(404).json({ message: "No result found for this student" });
            }

            const denied = refuseIfPublished(result);
            if (denied) return res.status(denied.status).json({ message: denied.message });

            // The one place that decides whether a result may be published.
            const collated = describeResult(result);
            if (!collated.ready) {
                return res.status(400).json({
                    message: `Cannot publish yet — the ${collated.missing.join(" and ")} is still missing`,
                });
            }

            const now = new Date().toISOString();
            const { data: updated, error } = await supabase
                .from("defence_results")
                .update({
                    finalScore: collated.finalScore,
                    grade: collated.grade,
                    status: "published",
                    publishedAt: now,
                    publishedBy: req.user.id,
                    updatedAt: now,
                })
                .eq("id", result.id)
                .select()
                .single();
            if (error) throw error;

            await safeSideEffect("publication audit", () =>
                recordScoreAudit([
                    {
                        resultId: result.id,
                        studentId,
                        field: "finalScore",
                        oldValue: null,
                        newValue: String(collated.finalScore),
                        action: "published",
                        actorId: req.user.id,
                        actorRole: req.user.role,
                    },
                ]),
            );

            await safeSideEffect("result notification", () =>
                createActivity({
                    userId: studentId,
                    type: "result_published",
                    title: "Final result published",
                    body: `Your final project score is ${collated.finalScore} (grade ${collated.grade}).`,
                    tone: "emerald",
                }),
            );

            res.json({ result: updated });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
);

app.get(
    "/api/defence-results/:studentId/audit",
    authenticateToken,
    requireRole("coordinator"),
    async (req, res) => {
        try {
            const entries = await fetchRows("defence_score_audit", (query) =>
                query.eq("studentId", req.params.studentId).order("createdAt", { ascending: false }),
            );
            res.json({ entries });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
);

// --- Defence checklist routes ------------------------------------------------
//
// Private to one student. No route here accepts a student id from the client:
// every read and write is scoped to req.user.id, so one student can never reach
// another's list even by guessing an item id.

app.get("/api/checklist", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const items = await fetchRows("defence_checklist_items", (query) =>
            query.eq("studentId", req.user.id).order("createdAt", { ascending: true }),
        );
        res.json({ items });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/checklist", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const payload = req.body ?? {};
        const title = typeof payload.title === "string" ? payload.title.trim() : "";
        const notes = typeof payload.notes === "string" ? payload.notes.trim() || null : null;

        if (!title) {
            return res.status(400).json({ message: "Give the checklist item a title" });
        }
        if (title.length > MAX_CHECKLIST_TITLE) {
            return res.status(400).json({
                message: `A checklist item cannot be longer than ${MAX_CHECKLIST_TITLE} characters`,
            });
        }
        if (notes && notes.length > MAX_CHECKLIST_NOTES) {
            return res.status(400).json({
                message: `Notes cannot be longer than ${MAX_CHECKLIST_NOTES} characters`,
            });
        }

        const now = new Date().toISOString();
        const { data: item, error } = await supabase
            .from("defence_checklist_items")
            .insert({
                studentId: req.user.id,
                title,
                notes,
                done: false,
                createdAt: now,
                updatedAt: now,
            })
            .select()
            .single();
        if (error) throw error;

        res.status(201).json({ item });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/checklist/:itemId", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const payload = req.body ?? {};
        const changes = { updatedAt: new Date().toISOString() };

        if (typeof payload.title === "string") {
            const title = payload.title.trim();
            if (!title) {
                return res.status(400).json({ message: "Give the checklist item a title" });
            }
            if (title.length > MAX_CHECKLIST_TITLE) {
                return res.status(400).json({
                    message: `A checklist item cannot be longer than ${MAX_CHECKLIST_TITLE} characters`,
                });
            }
            changes.title = title;
        }

        if (typeof payload.notes === "string") {
            const notes = payload.notes.trim();
            if (notes.length > MAX_CHECKLIST_NOTES) {
                return res.status(400).json({
                    message: `Notes cannot be longer than ${MAX_CHECKLIST_NOTES} characters`,
                });
            }
            changes.notes = notes || null;
        }

        if (typeof payload.done === "boolean") {
            changes.done = payload.done;
            changes.completedAt = payload.done ? new Date().toISOString() : null;
        }

        // The owner is part of the filter, so another student's item id simply
        // matches nothing rather than being edited.
        const { data: item, error } = await supabase
            .from("defence_checklist_items")
            .update(changes)
            .eq("id", req.params.itemId)
            .eq("studentId", req.user.id)
            .select()
            .maybeSingle();
        if (error) throw error;
        if (!item) {
            return res.status(404).json({ message: "Checklist item not found" });
        }

        res.json({ item });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/checklist/:itemId/delete", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const { data: deleted, error } = await supabase
            .from("defence_checklist_items")
            .delete()
            .eq("id", req.params.itemId)
            .eq("studentId", req.user.id)
            .select()
            .maybeSingle();
        if (error) throw error;
        if (!deleted) {
            return res.status(404).json({ message: "Checklist item not found" });
        }

        res.json({ deleted: deleted.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- Chapter routes ----------------------------------------------------------

app.get("/api/chapters", authenticateToken, async (req, res) => {
    try {
        if (req.user.role === "student") {
            const chapters = await ensureChaptersForStudent(req.user.id);
            return res.json({ chapters: await decorateChapters(chapters) });
        }

        if (req.user.role === "supervisor") {
            const studentId = typeof req.query.studentId === "string" ? req.query.studentId : "";
            if (!studentId) {
                return res.status(400).json({ message: "A studentId is required" });
            }

            // Never trust the id on its own: confirm the student really is assigned
            // to this supervisor before handing over their work.
            const allowed = await canReviewStudent(req.user, studentId);
            if (!allowed) {
                return res.status(403).json({ message: "This student is not assigned to you" });
            }

            const project = await findStudentProject(studentId);
            if (!project) return res.json({ chapters: [] });

            return res.json({ chapters: await decorateChapters(await listChapters(project.id)) });
        }

        return res.status(403).json({ message: "Insufficient permissions" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const CHAPTER_FILE_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

app.post(
    "/api/chapters/:chapterId/document",
    authenticateToken,
    requireRole("student"),
    upload.single("file"),
    async (req, res) => {
        const discardUpload = async () => {
            if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
        };

        try {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            if (!CHAPTER_FILE_TYPES.has(req.file.mimetype)) {
                await discardUpload();
                return res.status(400).json({ message: "Upload your chapter as a PDF or Word document" });
            }

            // The bytes are already on disk by the time the guards run, so a
            // rejected upload has to be removed again.
            const { chapter, denied } = await resolveOpenChapter(req.params.chapterId, req.user.id);
            if (denied) {
                await discardUpload();
                return res.status(denied.status).json({ message: denied.message });
            }

            const document = await createDocumentRecord({
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                path: req.file.path,
                uploadedBy: req.user.id,
            });

            const { data: updated, error } = await supabase
                .from("chapters")
                .update({ documentId: document.id, status: "draft", updatedAt: new Date().toISOString() })
                .eq("id", chapter.id)
                .select()
                .single();
            if (error) throw error;

            await safeSideEffect("chapter upload activity", () =>
                createActivity({
                    userId: req.user.id,
                    type: "chapter_uploaded",
                    title: `Chapter ${chapter.chapterNumber} draft uploaded`,
                    body: `${req.file.originalname} was added. Submit the chapter when it is ready for review.`,
                    tone: "indigo",
                }),
            );

            res.status(201).json({
                chapter: updated,
                document: normalizeDocument(document),
                message: "Chapter document uploaded",
            });
        } catch (error) {
            // Not discarded here: the failure may have happened after the document
            // record was written, and a stray file beats a row pointing at nothing.
            res.status(500).json({ message: error.message });
        }
    },
);

app.post("/api/chapters/:chapterId/submit", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const { chapter, denied } = await resolveOpenChapter(req.params.chapterId, req.user.id);
        if (denied) return res.status(denied.status).json({ message: denied.message });

        if (!chapter.documentId) {
            return res.status(400).json({ message: "Upload your chapter document before submitting it" });
        }

        if (REVIEWABLE_CHAPTER_STATUSES.has(chapter.status)) {
            return res.status(409).json({ message: "This chapter is already with your supervisor" });
        }

        if (chapter.status === "approved") {
            return res.status(409).json({ message: "This chapter has already been approved" });
        }

        const supervisorId = await getAssignedSupervisorId(req.user.id);
        if (!supervisorId) {
            return res.status(403).json({
                message: "You need an assigned supervisor before you can submit a chapter",
            });
        }

        const now = new Date().toISOString();
        const { data: updated, error } = await supabase
            .from("chapters")
            .update({ status: "submitted", submittedAt: now, updatedAt: now })
            .eq("id", chapter.id)
            .select()
            .single();
        if (error) throw error;

        // Mirror the submission into reviews so the supervisor queue and the
        // dashboard's pending-reviews count reflect it.
        await safeSideEffect("chapter review record", async () => {
            const { data: existing } = await supabase
                .from("reviews")
                .select("id")
                .eq("chapterId", chapter.id)
                .maybeSingle();

            const payload = {
                projectId: chapter.projectId,
                studentId: req.user.id,
                supervisorId,
                chapterId: chapter.id,
                type: "chapter",
                status: "pending",
                submittedAt: now,
                reviewedAt: null,
            };

            if (existing) {
                await supabase.from("reviews").update(payload).eq("id", existing.id);
            } else {
                await supabase.from("reviews").insert(payload);
            }
        });

        const student = await findUserById(req.user.id);
        const studentName = student ? normalizeUser(student).name : "A student";

        await safeSideEffect("chapter submitted activity", () =>
            createActivity({
                userId: req.user.id,
                type: "chapter_submitted",
                title: `Chapter ${chapter.chapterNumber} submitted`,
                body: `Chapter ${chapter.chapterNumber} is with your supervisor for review.`,
                tone: "indigo",
            }),
        );

        await safeSideEffect("chapter submitted notification", () =>
            createActivity({
                userId: supervisorId,
                type: "chapter_submitted",
                title: `Chapter ${chapter.chapterNumber} submitted`,
                body: `${studentName} submitted Chapter ${chapter.chapterNumber} for review.`,
                tone: "amber",
            }),
        );

        res.json({ chapter: updated, message: `Chapter ${chapter.chapterNumber} submitted for review` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/chapters/:chapterId/comments", authenticateToken, requireRole("supervisor"), async (req, res) => {
    try {
        const chapter = await findChapter(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: "Chapter not found" });

        const allowed = await canReviewStudent(req.user, chapter.studentId);
        if (!allowed) {
            return res.status(403).json({ message: "This student is not assigned to you" });
        }

        const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";
        if (!comment) {
            return res.status(400).json({ message: "Write a comment before adding it" });
        }

        const { data: saved, error } = await supabase
            .from("chapter_comments")
            .insert({
                chapterId: chapter.id,
                supervisorId: req.user.id,
                studentId: chapter.studentId,
                comment,
            })
            .select()
            .single();
        if (error) throw error;

        await safeSideEffect("chapter comment activity", () =>
            createActivity({
                userId: chapter.studentId,
                type: "chapter_comment",
                title: `New feedback on Chapter ${chapter.chapterNumber}`,
                body: comment,
                tone: "indigo",
            }),
        );

        res.status(201).json({ comment: saved, message: "Comment added" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const reviewChapter = async (req, res, status) => {
    try {
        const chapter = await findChapter(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: "Chapter not found" });

        const allowed = await canReviewStudent(req.user, chapter.studentId);
        if (!allowed) {
            return res.status(403).json({ message: "This student is not assigned to you" });
        }

        if (!REVIEWABLE_CHAPTER_STATUSES.has(chapter.status)) {
            return res.status(409).json({ message: "This chapter has not been submitted for review" });
        }

        const approving = status === "approved";
        const comments = typeof req.body?.comments === "string" ? req.body.comments.trim() : "";

        if (!approving && !comments) {
            return res.status(400).json({ message: "Add a comment explaining what needs revising" });
        }

        const chapters = withChapterAvailability(await listChapters(chapter.projectId));
        const previous = chapters.find((entry) => entry.chapterNumber === chapter.chapterNumber - 1);

        // Approving out of order would hand the student a chapter they never earned.
        if (approving && previous && previous.status !== "approved") {
            return res.status(409).json({
                message: `Chapter ${previous.chapterNumber} must be approved before chapter ${chapter.chapterNumber} can be`,
            });
        }

        const now = new Date().toISOString();
        const { data: updated, error } = await supabase
            .from("chapters")
            .update({ status, reviewedAt: now, reviewedBy: req.user.id, updatedAt: now })
            .eq("id", chapter.id)
            .select()
            .single();
        if (error) throw error;

        if (comments) {
            await safeSideEffect("chapter comment", () =>
                supabase.from("chapter_comments").insert({
                    chapterId: chapter.id,
                    supervisorId: req.user.id,
                    studentId: chapter.studentId,
                    comment: comments,
                }),
            );
        }

        await safeSideEffect("chapter review record", () =>
            supabase.from("reviews").update({ status, reviewedAt: now }).eq("chapterId", chapter.id),
        );

        const nextChapter = chapters.find((entry) => entry.chapterNumber === chapter.chapterNumber + 1);

        await safeSideEffect("chapter reviewed activity", () =>
            createActivity({
                userId: chapter.studentId,
                type: approving ? "chapter_approved" : "chapter_needs_revision",
                title: approving
                    ? `Chapter ${chapter.chapterNumber} approved`
                    : `Chapter ${chapter.chapterNumber} needs revision`,
                body: approving
                    ? nextChapter
                        ? `Chapter ${chapter.chapterNumber} is approved. Chapter ${nextChapter.chapterNumber} is now available to work on.`
                        : `Chapter ${chapter.chapterNumber} is approved. All chapters are complete.`
                    : `Chapter ${chapter.chapterNumber} needs revision. Your supervisor has left feedback.`,
                tone: approving ? "emerald" : "amber",
            }),
        );

        res.json({
            chapter: updated,
            message: approving
                ? `Chapter ${chapter.chapterNumber} approved`
                : `Revision requested for Chapter ${chapter.chapterNumber}`,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

app.post("/api/chapters/:chapterId/approve", authenticateToken, requireRole("supervisor"), (req, res) =>
    reviewChapter(req, res, "approved"),
);

app.post("/api/chapters/:chapterId/request-revision", authenticateToken, requireRole("supervisor"), (req, res) =>
    reviewChapter(req, res, "needs_revision"),
);

// uploads/ is not served statically, so the bytes are streamed here after the
// caller has been confirmed to be the owner or their assigned supervisor.
app.get("/api/chapters/:chapterId/document", authenticateToken, async (req, res) => {
    try {
        const chapter = await findChapter(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: "Chapter not found" });

        if (req.user.role === "student") {
            if (chapter.studentId !== req.user.id) {
                return res.status(403).json({ message: "This chapter is not yours" });
            }
        } else if (req.user.role === "supervisor") {
            const allowed = await canReviewStudent(req.user, chapter.studentId);
            if (!allowed) {
                return res.status(403).json({ message: "This student is not assigned to you" });
            }
        } else {
            return res.status(403).json({ message: "Insufficient permissions" });
        }

        if (!chapter.documentId) {
            return res.status(404).json({ message: "No document has been uploaded for this chapter" });
        }

        const { data: document, error } = await supabase
            .from("documents")
            .select("*")
            .eq("id", chapter.documentId)
            .maybeSingle();
        if (error) throw error;
        if (!document) return res.status(404).json({ message: "Document not found" });

        // The path was written by this server, but confirm it still resolves inside
        // uploads/ so a bad row can never read a file elsewhere on the machine.
        const resolved = path.resolve(document.path);
        if (!resolved.startsWith(uploadsDir + path.sep)) {
            return res.status(400).json({ message: "This document cannot be read" });
        }

        if (!fs.existsSync(resolved)) {
            return res.status(404).json({ message: "The stored file is missing from the server" });
        }

        const safeName = String(document.originalName).replace(/[^\w.\-]+/g, "_");

        res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
        return res.sendFile(resolved);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/api/final-submission", authenticateToken, requireRole("student"), async (req, res) => {
    try {
        const project = await findStudentProject(req.user.id);
        if (!project) {
            return res.status(404).json({ message: "You do not have a project yet" });
        }

        // Re-checked here rather than trusted from the client: the button state in
        // the browser is a convenience, not the rule.
        const chapters = await ensureChaptersForStudent(req.user.id);
        const unapproved = chapters.find((chapter) => chapter.status !== "approved");

        if (unapproved) {
            return res.status(409).json({
                message: `Chapter ${unapproved.chapterNumber} has not been approved yet`,
            });
        }

        const now = new Date().toISOString();
        const finalIndex = PROJECT_STAGE_INDEX.finalSubmission;
        const { data: updated, error } = await supabase
            .from("projects")
            .update({
                stage: PROJECT_TIMELINE[finalIndex],
                status: PROJECT_STATUS.finalSubmission,
                // The one stage whose progress is not a sixth of the bar: the project
                // is finished, so the timeline reads as complete.
                progress: progressForStage(finalIndex),
                finalSubmittedAt: now,
            })
            .eq("id", project.id)
            .select()
            .single();
        if (error) throw error;

        await safeSideEffect("final submission activity", () =>
            createActivity({
                userId: req.user.id,
                type: "final_submission",
                title: "Final project submitted",
                body: "Every chapter is approved. Your final project has been submitted for sign-off.",
                tone: "emerald",
            }),
        );

        await safeSideEffect("final submission notification", () =>
            notifyStudentSupervisor(req.user.id, {
                type: "final_submission",
                title: "Final project submitted",
                body: "A student has submitted their final project for sign-off.",
                tone: "emerald",
            }),
        );

        res.json({ project: updated, message: "Final project submitted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/api/documents/:documentId/download", authenticateToken, async (req, res) => {
    try {
        const { data: document, error } = await supabase
            .from("documents")
            .select("*")
            .eq("id", req.params.documentId)
            .maybeSingle();
        if (error) throw error;
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        if (!(await canAccessDocument(req.user, document))) {
            return res.status(403).json({ message: "You do not have access to this document" });
        }

        const resolvedPath = path.resolve(document.path);
        if (!resolvedPath.startsWith(path.resolve(uploadsDir) + path.sep)) {
            return res.status(400).json({ message: "Invalid document path" });
        }
        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ message: "The stored file is missing" });
        }

        // Rows written before the upload hardening stored the client filename
        // verbatim, so strip any directory part before handing it to the browser.
        return res.download(resolvedPath, path.basename(document.originalName));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.use(express.static(path.join(__dirname, "dist")));
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// The topic/proposal/meeting/defence workflows need these tables. Without them the
// related endpoints return 500 and the matching portal screens stay empty.
const REQUIRED_TABLES = [
    "users",
    "student_topics",
    "proposals",
    "supervisor_requests",
    "meeting_requests",
    "chapters",
    "chapter_comments",
    "messages",
    "defence_schedules",
    "defence_results",
    "defence_score_audit",
    "defence_checklist_items",
];

const verifySchema = async () => {
    const missing = [];
    for (const table of REQUIRED_TABLES) {
        const { error } = await supabase.from(table).select("id").limit(1);
        if (error) missing.push(table);
    }

    if (missing.length) {
        console.warn(
            `\n⚠  Missing Supabase table(s): ${missing.join(", ")}\n` +
            "   Run supabase/schema.sql in the Supabase SQL editor, then restart the server.\n",
        );
    } else {
        console.log("Supabase schema OK");
    }
};

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    verifySchema().catch((error) => console.warn(`Schema check failed: ${error.message}`));
});

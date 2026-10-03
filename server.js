import express from "express";
import cors from "cors";
import "dotenv/config";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { supabase } from "./src/services/supabaseServer.js";

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET || "dev-secret", (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
        req.user = user;
        next();
    });
};

const createToken = (user) =>
    jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "1d" });

const normalizeUser = (user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
    email: user.email,
    role: user.role,
    department: user.department,
    studentId: user.studentId,
});

const normalizeDocument = (document) => ({
    id: document.id,
    filename: document.filename,
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    path: document.path,
    uploadedBy: document.uploadedBy,
    uploadedAt: document.uploadedAt,
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

// Submitting a proposal is what creates a student's project and opens Chapter 1.
// The dashboard timeline has six evenly spread stages, so two completed stages
// (Proposal, Supervisor assigned) put "Chapter writing" in progress just past 2/6.
// Kept in step with `timeline` in src/pages/portal/StudentPortal.jsx.
const CHAPTER_ONE_STAGE = "Chapter 1 Started";
const CHAPTER_ONE_STATUS = "chapter_1_started";
const CHAPTER_ONE_PROGRESS = Math.round((100 / 6) * 2) + 1; // 34

// Any of these means the student is past submission and entitled to Chapter 1.
const SUBMITTED_PROPOSAL_STATUSES = new Set(["submitted", "under_review", "approved"]);

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

// Creates the student's project if it does not exist yet and opens Chapter 1.
// Idempotent by design: a student may resubmit a proposal at any time, and a
// resubmission must never pull an already-open chapter backwards.
const startFirstChapter = async ({ studentId, title }) => {
    // Nothing else in the app creates a project, so this may be the first one. It is
    // created at the default stage/progress and advanced in the last step, so the
    // stage only ever moves at the moment the chapter actually opens.
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
    if (!first) return null;

    // Only a chapter nobody has touched is opened. Once it is in progress,
    // submitted or approved, a resubmitted proposal leaves it exactly as it is.
    if (first.status !== "not_started") return null;

    const now = new Date().toISOString();
    const { data: started, error: chapterError } = await supabase
        .from("chapters")
        .update({ status: "in_progress", updatedAt: now })
        .eq("id", first.id)
        .eq("status", "not_started") // two concurrent submissions must not both win
        .select()
        .maybeSingle();
    if (chapterError) throw chapterError;
    if (!started) return null;

    // The timeline moves only once the chapter really opened, so the project stage
    // can never run ahead of the work.
    const { error: projectError } = await supabase
        .from("projects")
        .update({ stage: CHAPTER_ONE_STAGE, status: CHAPTER_ONE_STATUS, progress: CHAPTER_ONE_PROGRESS })
        .eq("id", project.id);
    if (projectError) throw projectError;

    await safeSideEffect("chapter 1 started activity", () =>
        createActivity({
            userId: studentId,
            type: "chapter_started",
            title: "Chapter 1 started",
            body: "Your proposal was submitted and Chapter 1 is now open. Upload your draft when you are ready.",
            tone: "indigo",
        }),
    );

    return project;
};

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
    if (!proposal || !SUBMITTED_PROPOSAL_STATUSES.has(proposal.status)) return project;

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

        // Self-heal: a student whose proposal predates this workflow gets their
        // project and Chapter 1 on their next portal read rather than waiting for a
        // resubmission. Healed before the reads below so the project and the chapters
        // it unlocks come back in the same response. Degrades like the other portal
        // reads so a missing proposals table cannot take the rest of the page down.
        //
        // `stage` stays at its 'proposal' default until the chapter actually opens, so
        // it also catches a start that was interrupted halfway — a project created but
        // left with Chapter 1 untouched. Those retry on every read until they land.
        if (!project || project.stage === "proposal") {
            try {
                project = await healUnstartedStudent(user.id, project);
            } catch (error) {
                console.warn(`[portal] chapter 1 self-heal unavailable: ${error.message}`);
            }
        }

        const [chapters, meetings, defenses, messages, supervisorRequest, topic, proposal] = await Promise.all([
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

        return { role: user.role, project, topics, chapters, meetings, defenses, messages, topic, proposal, supervisorRequest: await getSupervisorRequestDetails(supervisorRequest) };
    }

    if (user.role === "supervisor") {
        const assignments = await fetchRows("supervisor_requests", (query) =>
            query.eq("supervisorId", user.id).eq("status", "assigned"),
        );
        const studentIds = assignments.map((assignment) => assignment.studentId);
        const [projects, reviews, meetings, students, messages, studentTopics, proposals] = await Promise.all([
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
        ]);
        return {
            role: user.role,
            students: students.map(normalizeUser),
            projects,
            reviews,
            meetings,
            messages,
            topics,
            studentTopics: await Promise.all(studentTopics.map(withStudent)),
            proposals,
        };
    }

    const [students, supervisors, pendingRequests, projects, defenses, studentUsers, supervisorUsers, projectRows, defenseRows, topicRows, proposalRows] = await Promise.all([
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
    ]);
    return {
        role: user.role,
        stats: { students, supervisors, pendingRequests, projects, defenses },
        students: studentUsers.map(normalizeUser),
        supervisors: supervisorUsers.map(normalizeUser),
        projects: projectRows,
        defenses: defenseRows,
        topics,
        studentTopics: await Promise.all(topicRows.map(withStudent)),
        proposals: proposalRows,
    };
};

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, department, studentId } = req.body;
        const validRoles = new Set(["student", "supervisor", "coordinator"]);

        if (!validRoles.has(role)) {
            return res.status(400).json({ message: "Invalid user role" });
        }

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createUser({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            department,
            studentId,
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

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await findUserByEmail(email);
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
        const { data: updated, error } = await supabase
            .from("projects")
            .update({ stage: "Final submission", status: "final_submission", finalSubmittedAt: now })
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

app.post("/api/documents/upload", authenticateToken, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const document = await createDocumentRecord({
            filename: req.file.filename,
            originalName: req.file.originalname,
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
});

app.use(express.static(path.join(__dirname, "dist")));
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// The topic/proposal/meeting workflows need these tables. Without them the
// related endpoints return 500 and the matching portal screens stay empty.
const REQUIRED_TABLES = [
    "users",
    "student_topics",
    "proposals",
    "supervisor_requests",
    "meeting_requests",
    "chapters",
    "chapter_comments",
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

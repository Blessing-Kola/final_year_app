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

const getPortalData = async (user) => {
    const topics = await fetchRows("project_topics", (query) =>
        query.order("createdAt", { ascending: false }),
    );

    if (user.role === "student") {
        const projects = await fetchRows("projects", (query) =>
            query.eq("studentId", user.id).limit(1),
        );
        const project = projects[0] ?? null;
        const [chapters, meetings, defenses, messages, supervisorRequest] = await Promise.all([
            project
                ? fetchRows("chapters", (query) => query.eq("projectId", project.id).order("updatedAt", { ascending: false }))
                : [],
            fetchRows("meetings", (query) => query.eq("studentId", user.id).order("scheduledAt", { ascending: true })),
            fetchRows("defenses", (query) => query.eq("studentId", user.id).order("scheduledAt", { ascending: true })),
            fetchRows("messages", (query) =>
                query.or(`senderId.eq.${user.id},recipientId.eq.${user.id}`).order("createdAt", { ascending: false }),
            ),
            getActiveSupervisorRequest(user.id),
        ]);

        return { role: user.role, project, topics, chapters, meetings, defenses, messages, supervisorRequest: await getSupervisorRequestDetails(supervisorRequest) };
    }

    if (user.role === "supervisor") {
        const assignments = await fetchRows("supervisor_requests", (query) =>
            query.eq("supervisorId", user.id).eq("status", "assigned"),
        );
        const studentIds = assignments.map((assignment) => assignment.studentId);
        const [projects, reviews, meetings, students] = await Promise.all([
            studentIds.length ? fetchRows("projects", (query) => query.in("studentId", studentIds)) : [],
            fetchRows("reviews", (query) => query.eq("supervisorId", user.id).order("submittedAt", { ascending: false })),
            fetchRows("meetings", (query) => query.eq("supervisorId", user.id).order("scheduledAt", { ascending: true })),
            studentIds.length ? fetchRows("users", (query) => query.in("id", studentIds)) : [],
        ]);
        return { role: user.role, students: students.map(normalizeUser), projects, reviews, meetings, topics };
    }

    if (user.role === "examiner") {
        const panelMemberships = await fetchRows("defense_panel_members", (query) => query.eq("userId", user.id));
        const defenseIds = panelMemberships.map((membership) => membership.defenseId);
        const [defenses, evaluations] = await Promise.all([
            defenseIds.length ? fetchRows("defenses", (query) => query.in("id", defenseIds).order("scheduledAt", { ascending: true })) : [],
            fetchRows("evaluations", (query) => query.eq("examinerId", user.id).order("submittedAt", { ascending: false })),
        ]);
        return { role: user.role, defenses, evaluations, topics };
    }

    const [students, supervisors, pendingRequests, projects, defenses, studentUsers, supervisorUsers, projectRows, defenseRows] = await Promise.all([
        fetchCount("users", (query) => query.eq("role", "student")),
        fetchCount("users", (query) => query.eq("role", "supervisor")),
        fetchCount("supervisor_requests", (query) => query.eq("status", "pending")),
        fetchCount("projects"),
        fetchCount("defenses", (query) => query.not("status", "eq", "unscheduled")),
        fetchRows("users", (query) => query.eq("role", "student").order("createdAt", { ascending: false })),
        fetchRows("users", (query) => query.eq("role", "supervisor").order("createdAt", { ascending: false })),
        fetchRows("projects", (query) => query.order("createdAt", { ascending: false })),
        fetchRows("defenses", (query) => query.order("scheduledAt", { ascending: true })),
    ]);
    return {
        role: user.role,
        stats: { students, supervisors, pendingRequests, projects, defenses },
        students: studentUsers.map(normalizeUser),
        supervisors: supervisorUsers.map(normalizeUser),
        projects: projectRows,
        defenses: defenseRows,
        topics,
    };
};

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, department, studentId } = req.body;
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

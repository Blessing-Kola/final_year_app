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

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
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
        const studentIds = [...new Set(
            assignments
                .map((assignment) => assignment.studentId)
                .filter((studentId) => studentId !== null && studentId !== undefined && studentId !== ""),
        )];
        const [projects, reviews, meetings, students] = await Promise.all([
            studentIds.length ? fetchRows("projects", (query) => query.in("studentId", studentIds)) : [],
            fetchRows("reviews", (query) => query.eq("supervisorId", user.id).order("submittedAt", { ascending: false })),
            fetchRows("meetings", (query) => query.eq("supervisorId", user.id).order("scheduledAt", { ascending: true })),
            studentIds.length ? fetchRows("users", (query) => query.in("id", studentIds)) : [],
        ]);
        return { role: user.role, students: students.map(normalizeUser), projects, reviews, meetings, topics };
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

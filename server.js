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

const listDocumentsForUser = async (userId) => {
    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("uploadedBy", userId)
        .order("uploadedAt", { ascending: false });
    if (error) throw error;
    return data;
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

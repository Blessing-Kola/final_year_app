import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

dotenv.config();

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

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "supervisor", "coordinator"], default: "student" },
    department: String,
    studentId: String,
    createdAt: { type: Date, default: Date.now },
});

const documentSchema = new mongoose.Schema({
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Document = mongoose.model("Document", documentSchema);

let mongoReady = false;
let memoryUsers = [];
let memoryDocuments = [];

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
    jwt.sign({ id: user._id ? user._id.toString() : user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "1d" });

const normalizeUser = (user) => ({
    id: user._id ? user._id.toString() : user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
    email: user.email,
    role: user.role,
    department: user.department,
    studentId: user.studentId,
});

const normalizeDocument = (document) => ({
    id: document._id ? document._id.toString() : document.id,
    filename: document.filename,
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    path: document.path,
    uploadedBy: document.uploadedBy,
    uploadedAt: document.uploadedAt,
});

const findUserByEmail = async (email) => {
    if (mongoReady) {
        return User.findOne({ email });
    }
    return memoryUsers.find((user) => user.email === email) || null;
};

const findUserById = async (id) => {
    if (mongoReady) {
        return User.findById(id).select("-password");
    }
    return memoryUsers.find((user) => user.id === id) || null;
};

const createUser = async (userData) => {
    if (mongoReady) {
        return User.create(userData);
    }

    const user = {
        id: randomUUID(),
        ...userData,
        createdAt: new Date(),
    };
    memoryUsers.push(user);
    return user;
};

const createDocumentRecord = async (documentData) => {
    if (mongoReady) {
        return Document.create(documentData);
    }

    const document = {
        id: randomUUID(),
        ...documentData,
        uploadedAt: new Date(),
    };
    memoryDocuments.push(document);
    return document;
};

const listDocumentsForUser = async (userId) => {
    if (mongoReady) {
        return Document.find({ uploadedBy: userId }).sort({ uploadedAt: -1 });
    }

    return memoryDocuments
        .filter((document) => document.uploadedBy === userId)
        .sort((first, second) => new Date(second.uploadedAt) - new Date(first.uploadedAt));
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

const connectToDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/thesishub");
        mongoReady = true;
        console.log("MongoDB connected");
    } catch (error) {
        console.warn("MongoDB unavailable, using memory store", error.message);
    }
};

connectToDatabase().finally(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

const express = require("express");
const cookieParser = require("cookie-parser");
const db = require('./db');
const path = require("path");

const PORT = 3000;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Serve static HTMLs
app.get("/", (req, res) => {
    const { username } = req.cookies;
    if (!username) {
        return res.sendFile(path.join(__dirname, "public", "login.html"));
    }

    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    const user = stmt.get(username);

    if (user) {
        return res.sendFile(path.join(__dirname, "public", "dashboard.html"));
    } else {
        return res.sendFile(path.join(__dirname, "public", "login.html"));
    }
});

// Login API
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    const stmt = db.prepare("SELECT role FROM users WHERE username = ? AND password = ?");
    const user = stmt.get(username, password);

    if (user) {
        res.cookie("username", username);
        res.cookie("role", user.role);
        res.json({ success: true, role: user.role });
    } else {
        res.json({ success: false });
    }
});

app.get("/api/users", (_, res) => {
    const stmt = db.prepare("SELECT username FROM users WHERE role='user'");
    const users = stmt.all().map(u => u.username);
    res.json(users);
});

// Add Task API
app.get("/api/tasks", (req, res) => {
    const { user } = req.query;
    try {
        const stmt = db.prepare("SELECT * FROM tasks WHERE assignTo = ?");
        const tasks = stmt.all(user);
        res.json(tasks);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
});

app.post("/api/add-task", (req, res) => {
    const role = req.cookies?.role;
    if (role !== "admin") {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const { assignTo, taskName, taskDesc = "", start, end } = req.body;

    const startDate = new Date(start);
    const endDate = new Date(end);

    // ⏱ Swap dates if needed
    const [fixedStart, fixedEnd] = endDate < startDate
        ? [endDate.toISOString(), startDate.toISOString()]
        : [startDate.toISOString(), endDate.toISOString()];
    try {
        const userExists = db.prepare("SELECT * FROM users WHERE username = ?").get(assignTo);
        if (!userExists) return res.status(400).json({ success: false, message: "User not found" });

        const insert = db.prepare(`INSERT INTO tasks 
      (assignTo, taskName, taskDesc, start, end, status)
      VALUES (?, ?, ?, ?, ?, ?)`);
        insert.run(assignTo, taskName, taskDesc, fixedStart, fixedEnd, "assigned");

        res.json({ success: true });
    } catch (err) {
        console.error("🔴 Insert failed:", err);
        res.status(500).json({ success: false, message: "Insert failed" });
    }
});

app.put("/api/update-task", (req, res) => {
    const role = req.cookies?.role;
    if (role !== "admin") {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id, assignTo, taskName, taskDesc, start, end, status } = req.body;

    const update = db.prepare(`UPDATE tasks SET 
      assignTo = ?, taskName = ?, taskDesc = ?, start = ?, end = ?, status = ? 
      WHERE id = ?`);

    try {
        update.run(assignTo, taskName, taskDesc, start, end, status, id);
        res.json({ success: true });
    } catch (err) {
        console.error("🔴 Update failed:", err);
        res.status(500).json({ success: false, message: "Update failed" });
    }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
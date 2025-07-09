const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");

const users = require("./users");
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Serve static HTMLs
app.get("/", (req, res) => {
    if (req.cookies && req.cookies.username) {
        const userExists = users.find(u => u.username === req.cookies.username);
        if (userExists) {
            return res.sendFile(path.join(__dirname, "public", "dashboard.html"));
        }
    }
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Login API
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.cookie("username", username);
        res.cookie("role", user.role);
        res.json({ success: true, role: user.role });
    } else {
        res.json({ success: false });
    }
});

// Add Task API
app.post("/api/add-task", (req, res) => {
    const { username } = req.cookies;
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { assignTo, taskName, taskDesc = "", start, end } = req.body;

    // 🛡️ Date sanity check
    let startDate = new Date(start);
    let endDate = new Date(end);

    // Swap if needed
    if (endDate < startDate) {
        [startDate, endDate] = [endDate, startDate];
    }

    const targetUser = users.find(u => u.username === assignTo);
    if (!targetUser) return res.status(400).json({ success: false, message: "User not found" });

    const task = {
        assignTo, taskName, taskDesc, start: startDate.toISOString(),
        end: endDate.toISOString()
    };
    const filePath = path.join(__dirname, "data", "tasks.json");

    let existing = [];
    if (fs.existsSync(filePath)) {
        existing = JSON.parse(fs.readFileSync(filePath));
    }

    existing.push(task);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

    res.json({ success: true, task });
});

app.get("/api/users", (req, res) => {
    const publicUsers = users.map(({ username, role }) => { if (role == 'user') return username });
    res.json(publicUsers);
});

app.get("/api/tasks", (req, res) => {
    const { user } = req.query;
    const filePath = path.join(__dirname, "data", "tasks.json");

    if (!fs.existsSync(filePath)) return res.json([]);

    try {
        const allTasks = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const userTasks = allTasks.filter(t => t.assignTo === user);
        res.json(userTasks);
    } catch (err) {
        console.error("❌ Failed to parse tasks.json:", err.message);
        res.json([]);
    }
});


const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

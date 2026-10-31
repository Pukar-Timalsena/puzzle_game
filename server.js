const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

// Load .env variables if file exists
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath) && process.loadEnvFile) {
  process.loadEnvFile(envPath);
}

const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/game");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "banana_secret_key_2026_dev";

// Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware
app.use(
  session({
    name: "banana_sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

// Serve static assets from public (css, js, images)
app.use(express.static(path.join(__dirname, "public")));

// Route helpers for page protection
const requireAuthPage = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("/login");
  }
  next();
};

const redirectIfAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/game");
  }
  next();
};

// View Page Routes
app.get("/", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/game");
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
  // If registered just now, clear any previous session and show login page
  if (req.query.registered === "true") {
    if (req.session) {
      req.session.userId = null;
      req.session.username = null;
    }
    return res.sendFile(path.join(__dirname, "views", "login.html"));
  }

  if (req.session && req.session.userId) {
    return res.redirect("/game");
  }
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/register", redirectIfAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.get("/game", requireAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "game.html"));
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);

// 404 Handler
app.use((req, res) => {
  if (req.accepts("html")) {
    res.status(404).redirect("/");
  } else {
    res.status(404).json({ error: "Endpoint not found" });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`🍌 Banana Game server running at http://localhost:${PORT}`);
});

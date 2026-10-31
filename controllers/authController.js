const User = require("../models/User");

exports.register = async (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = username ? String(username).trim() : "";

  if (!cleanUsername || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters long." });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters long." });
  }

  try {
    const existingUser = User.findByUsername(cleanUsername);
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists. Please choose another." });
    }

    const newUser = await User.create(cleanUsername, password);

    // Clear any prior session so the newly registered user must log in through /login
    if (req.session) {
      req.session.userId = null;
      req.session.username = null;
    }

    return res.status(201).json({
      message: "Registration successful. Please log in.",
      user: { id: newUser.id, username: newUser.username }
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Failed to register user. Please try again." });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = username ? String(username).trim() : "";

  if (!cleanUsername || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const user = User.findByUsername(cleanUsername);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const isMatch = await User.verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    if (req.session) {
      req.session.userId = user.id;
      req.session.username = user.username;
    }

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        high_score: user.high_score || 0,
        games_played: user.games_played || 0
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Failed to log in. Please try again." });
  }
};

exports.logout = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Could not log out." });
      }
      res.clearCookie("banana_sid");
      return res.json({ message: "Logged out successfully" });
    });
  } else {
    return res.json({ message: "Logged out successfully" });
  }
};

exports.getCurrentUser = (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ authenticated: false, error: "Not logged in" });
  }
  const user = User.findById(req.session.userId);
  if (!user) {
    return res.status(404).json({ authenticated: false, error: "User not found" });
  }
  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      high_score: user.high_score || 0,
      games_played: user.games_played || 0
    }
  });
};

exports.updateScore = (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { score } = req.body;
  const numScore = Number(score);
  if (isNaN(numScore) || numScore < 0) {
    return res.status(400).json({ error: "Invalid score" });
  }

  try {
    User.updateHighScore(req.session.userId, numScore);
    const updatedUser = User.findById(req.session.userId);
    return res.json({
      message: "Score updated",
      high_score: updatedUser ? updatedUser.high_score : numScore
    });
  } catch (error) {
    console.error("Score update error:", error);
    return res.status(500).json({ error: "Failed to update score" });
  }
};

exports.getLeaderboard = (req, res) => {
  try {
    const leaderboard = User.getLeaderboard(5);
    return res.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

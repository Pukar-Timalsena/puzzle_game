const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");

// Authentication middleware for game routes
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  next();
}

router.get("/puzzle", requireAuth, gameController.getPuzzle);
router.post("/check", requireAuth, gameController.checkAnswer);
router.post("/reset", requireAuth, gameController.resetScore);

module.exports = router;

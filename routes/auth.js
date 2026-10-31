const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.getCurrentUser);
router.post("/score", authController.updateScore);
router.get("/leaderboard", authController.getLeaderboard);

module.exports = router;

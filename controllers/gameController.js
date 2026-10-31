const User = require("../models/User");

// Fallback puzzles if remote Banana API experiences downtime
const FALLBACK_PUZZLES = [
  {
    question: "https://www.sanfoh.com/uob/banana/data/t72abdd7db00fd692bddc7bc4b2n63.png",
    solution: 3
  },
  {
    question: "https://www.sanfoh.com/uob/banana/data/t98b71d650119e71ec26a8dca5f782c.png",
    solution: 7
  },
  {
    question: "https://www.sanfoh.com/uob/banana/data/tb83f769d06b3bc4f1a6ec7102641a9.png",
    solution: 5
  }
];

// Fetch puzzle from Banana API and store solution securely in server session
exports.getPuzzle = async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Please log in to play." });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://marcconrad.com/uob/banana/api.php?out=json", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Banana API responded with status ${response.status}`);
    }

    const data = await response.json();
    const solutionNum = parseInt(data.solution, 10);

    // SECURE: Store solution in server-side session only. Do NOT expose to client!
    req.session.currentSolution = solutionNum;

    return res.json({
      question: data.question
    });
  } catch (error) {
    console.warn("Banana API unavailable, using resilient fallback:", error.message);
    const fallback = FALLBACK_PUZZLES[Math.floor(Math.random() * FALLBACK_PUZZLES.length)];
    req.session.currentSolution = fallback.solution;

    return res.json({
      question: fallback.question,
      fallbackNotice: true
    });
  }
};

// Check submitted digit against server-side session solution
exports.checkAnswer = (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Please log in to play." });
  }

  const { answer } = req.body;
  if (answer === undefined || answer === null || answer === "") {
    return res.status(400).json({ error: "Please enter or select a digit (0-9)." });
  }

  const userDigit = parseInt(answer, 10);
  if (isNaN(userDigit) || userDigit < 0 || userDigit > 9) {
    return res.status(400).json({ error: "Invalid digit. Answer must be a single digit between 0 and 9." });
  }

  const correctSolution = req.session.currentSolution;
  if (correctSolution === undefined || correctSolution === null) {
    return res.status(400).json({ error: "No active puzzle. Please request a new puzzle." });
  }

  const isCorrect = (userDigit === Number(correctSolution));

  if (isCorrect) {
    // Invalidate current solution so it can't be re-submitted repeatedly
    req.session.currentSolution = null;

    // Increment current session score
    req.session.score = (req.session.score || 0) + 10;
    req.session.streak = (req.session.streak || 0) + 1;

    // Fetch user and check high score
    const user = User.findById(req.session.userId);
    let newHighScore = false;
    let currentHigh = user ? (user.high_score || 0) : 0;

    if (req.session.score > currentHigh) {
      User.updateHighScore(req.session.userId, req.session.score);
      currentHigh = req.session.score;
      newHighScore = true;
    }

    return res.json({
      correct: true,
      solution: correctSolution,
      score: req.session.score,
      streak: req.session.streak,
      high_score: currentHigh,
      newHighScore,
      message: "🎉 Correct! That is the missing digit!"
    });
  } else {
    // Reset streak on incorrect answer
    req.session.streak = 0;
    return res.json({
      correct: false,
      score: req.session.score || 0,
      streak: 0,
      message: "❌ Not correct! Look closely at the equation and try again."
    });
  }
};

// Reset current session game score (start fresh run)
exports.resetScore = (req, res) => {
  if (req.session) {
    req.session.score = 0;
    req.session.streak = 0;
    req.session.currentSolution = null;
  }
  return res.json({ message: "Game reset", score: 0, streak: 0 });
};

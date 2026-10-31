document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const usernameDisplay = document.getElementById("usernameDisplay");
  const userHighScore = document.getElementById("userHighScore");
  const logoutBtn = document.getElementById("logoutBtn");

  const puzzleImage = document.getElementById("puzzleImage");
  const loadingState = document.getElementById("loadingState");
  const feedbackBanner = document.getElementById("feedbackBanner");
  const keypadGrid = document.getElementById("keypadGrid");
  const nextPuzzleBtn = document.getElementById("nextPuzzleBtn");
  const resetScoreBtn = document.getElementById("resetScoreBtn");

  const scoreDisplay = document.getElementById("scoreDisplay");
  const streakDisplay = document.getElementById("streakDisplay");
  const bestScoreDisplay = document.getElementById("bestScoreDisplay");

  // State
  let isSubmitting = false;
  let currentHighScore = 0;
  let autoNextTimeout = null;

  // 1. Session & Auth Check
  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        window.location.replace("/login");
        return false;
      }
      const data = await res.json();
      if (!data.authenticated || !data.user) {
        window.location.replace("/login");
        return false;
      }

      if (usernameDisplay) usernameDisplay.textContent = data.user.username;
      currentHighScore = data.user.high_score || 0;
      if (userHighScore) userHighScore.textContent = currentHighScore;
      if (bestScoreDisplay) bestScoreDisplay.textContent = currentHighScore;
      return true;
    } catch (err) {
      console.error("Auth check failed:", err);
      window.location.replace("/login");
      return false;
    }
  }

  // 2. Sign Out
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        window.location.href = "/login";
      }
    });
  }

  // 3. UI Helpers
  function setFeedback(message, type = "info") {
    if (!feedbackBanner) return;
    feedbackBanner.className = `feedback-banner feedback-${type}`;
    feedbackBanner.textContent = message;
    feedbackBanner.style.display = message ? "block" : "none";
  }

  function setKeypadDisabled(disabled) {
    const buttons = document.querySelectorAll(".digit-btn");
    buttons.forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  // 4. Fetch Puzzle from Banana API via Backend
  async function loadPuzzle() {
    if (autoNextTimeout) {
      clearTimeout(autoNextTimeout);
      autoNextTimeout = null;
    }

    isSubmitting = false;
    setFeedback("");
    setKeypadDisabled(true);

    // Reset button states
    document.querySelectorAll(".digit-btn").forEach((btn) => {
      btn.classList.remove("digit-correct", "digit-incorrect");
    });

    // Show loading
    loadingState.style.display = "flex";
    puzzleImage.style.display = "none";

    try {
      const res = await fetch("/api/game/puzzle");
      if (res.status === 401) {
        window.location.replace("/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load puzzle");
      }

      const data = await res.json();

      // Preload image
      const img = new Image();
      img.onload = () => {
        puzzleImage.src = data.question;
        loadingState.style.display = "none";
        puzzleImage.style.display = "inline-block";
        setKeypadDisabled(false);
      };
      img.onerror = () => {
        loadingState.innerHTML = '<span style="color: #dc2626;">Error displaying puzzle image. Click "Next Puzzle" to retry.</span>';
        setKeypadDisabled(false);
      };
      img.src = data.question;
    } catch (err) {
      console.error("Puzzle load error:", err);
      loadingState.innerHTML = '<span style="color: #dc2626;">Unable to reach Banana API. Please click "Next Puzzle" to retry.</span>';
      setKeypadDisabled(false);
    }
  }

  // 5. Submit Digit Answer
  async function submitAnswer(digit) {
    if (isSubmitting) return;
    isSubmitting = true;

    const clickedBtn = document.querySelector(`.digit-btn[data-digit="${digit}"]`);

    try {
      const res = await fetch("/api/game/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: digit })
      });

      if (res.status === 401) {
        window.location.replace("/login");
        return;
      }

      const result = await res.json();

      if (result.correct) {
        if (clickedBtn) clickedBtn.classList.add("digit-correct");
        setKeypadDisabled(true);

        // Update score and stats
        if (scoreDisplay) scoreDisplay.textContent = result.score;
        if (streakDisplay) streakDisplay.textContent = result.streak;

        if (result.high_score !== undefined) {
          currentHighScore = result.high_score;
          if (userHighScore) userHighScore.textContent = currentHighScore;
          if (bestScoreDisplay) bestScoreDisplay.textContent = currentHighScore;
        }

        // Clean transition: launch Turbo Car Race directly
        setFeedback("Correct! Launching Turbo Racing...", "success");

        // Automatically open the car racing game upon puzzle completion
        autoNextTimeout = setTimeout(() => {
          setFeedback("");
          if (window.openCarRace) {
            window.openCarRace();
          }
          // Silently prepare next puzzle
          loadPuzzle();
        }, 400);
      } else {
        if (clickedBtn) {
          clickedBtn.classList.add("digit-incorrect");
          setTimeout(() => clickedBtn.classList.remove("digit-incorrect"), 600);
        }
        if (streakDisplay) streakDisplay.textContent = 0;
        setFeedback(result.message || "❌ Not correct! Look at the equation and try again.", "error");
        isSubmitting = false;
      }
    } catch (err) {
      console.error("Check answer error:", err);
      setFeedback("Connection error while verifying answer.", "error");
      isSubmitting = false;
    }
  }

  // 6. Reset Current Run Score
  async function resetScore() {
    try {
      const res = await fetch("/api/game/reset", { method: "POST" });
      if (res.ok) {
        if (scoreDisplay) scoreDisplay.textContent = "0";
        if (streakDisplay) streakDisplay.textContent = "0";
        setFeedback("Score reset. Ready for a new run!", "info");
        loadPuzzle();
      }
    } catch (err) {
      console.error("Reset error:", err);
    }
  }

  // Event Listeners
  if (keypadGrid) {
    keypadGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".digit-btn");
      if (btn && !btn.disabled && !isSubmitting) {
        const digit = btn.getAttribute("data-digit");
        submitAnswer(digit);
      }
    });
  }

  // Keyboard support: Press 0-9 directly to submit!
  document.addEventListener("keydown", (e) => {
    // Only trigger if race modal is closed and no text inputs are focused
    const raceModal = document.getElementById("raceModal");
    if (raceModal && raceModal.style.display !== "none") {
      return;
    }
    if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      return;
    }
    if (e.key >= "0" && e.key <= "9") {
      submitAnswer(e.key);
    }
  });

  if (nextPuzzleBtn) nextPuzzleBtn.addEventListener("click", loadPuzzle);
  if (resetScoreBtn) resetScoreBtn.addEventListener("click", resetScore);

  // Initialize
  const ok = await checkAuth();
  if (ok) {
    loadPuzzle();
  }
});

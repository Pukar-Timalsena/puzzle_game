document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const errorEl = document.getElementById("error");
  const noticeEl = document.getElementById("notice");
  const submitBtn = document.getElementById("submitBtn");

  // Check if redirected from registration
  const params = new URLSearchParams(window.location.search);
  if (params.get("registered") === "true" && noticeEl) {
    noticeEl.textContent = "Account created successfully! Please log in.";
    noticeEl.style.display = "block";
  }

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = "block";
    }
  }

  function hideError() {
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();

      const username = loginForm.username.value.trim();
      const password = loginForm.password.value;

      if (!username) {
        showError("Please enter your username.");
        loginForm.username.focus();
        return;
      }

      if (!password) {
        showError("Please enter your password.");
        loginForm.password.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Logging In...";
      }

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
          showError(data.error || "Invalid username or password.");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Login";
          }
          return;
        }

        // Successfully logged in: redirect to the main website (/game)
        window.location.href = "/game";
      } catch (err) {
        console.error("Login network error:", err);
        showError("Unable to connect to the server. Please try again.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Login";
        }
      }
    });
  }
});

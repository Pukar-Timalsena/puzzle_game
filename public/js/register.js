document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const errorEl = document.getElementById("error");
  const submitBtn = document.getElementById("submitBtn");

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = "flex";
    }
  }

  function hideError() {
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();

      const username = registerForm.username.value.trim();
      const password = registerForm.password.value;
      const confirmPassword = registerForm.confirmPassword ? registerForm.confirmPassword.value : "";

      // Validation
      if (!username) {
        showError("Please enter a username.");
        registerForm.username.focus();
        return;
      }

      if (username.length < 3) {
        showError("Username must be at least 3 characters long.");
        registerForm.username.focus();
        return;
      }

      if (!password) {
        showError("Please enter a password.");
        registerForm.password.focus();
        return;
      }

      if (password.length < 4) {
        showError("Password must be at least 4 characters long.");
        registerForm.password.focus();
        return;
      }

      if (confirmPassword && password !== confirmPassword) {
        showError("Passwords do not match. Please re-enter.");
        registerForm.confirmPassword.focus();
        return;
      }

      // UI state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating Account...";
      }

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
          showError(data.error || "Registration failed. Please try a different username.");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Register";
          }
          return;
        }

        // Successfully registered: redirect user to the Login page immediately
        window.location.href = "/login?registered=true";
      } catch (err) {
        console.error("Registration network error:", err);
        showError("Unable to connect to the server. Please try again.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Register";
        }
      }
    });
  }
});

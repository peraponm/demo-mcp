document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Authentication elements
  const userIcon = document.getElementById("user-icon");
  const dropdownContent = document.getElementById("dropdown-content");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const closeModal = document.querySelector(".close");
  const loginForm = document.getElementById("login-form");
  const loggedOutMenu = document.getElementById("logged-out-menu");
  const loggedInMenu = document.getElementById("logged-in-menu");
  const usernameDisplay = document.getElementById("username-display");
  const signupSection = document.getElementById("signup-container");

  // Authentication state
  let isAuthenticated = false;
  let currentUsername = null;

  // Check authentication status on page load
  async function checkAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const data = await response.json();
      
      isAuthenticated = data.authenticated;
      currentUsername = data.username;
      
      updateUIForAuthState();
    } catch (error) {
      console.error("Error checking auth status:", error);
      isAuthenticated = false;
      updateUIForAuthState();
    }
  }

  // Update UI based on authentication state
  function updateUIForAuthState() {
    if (isAuthenticated) {
      loggedOutMenu.classList.add("hidden");
      loggedInMenu.classList.remove("hidden");
      usernameDisplay.textContent = currentUsername;
      signupSection.classList.remove("hidden");
    } else {
      loggedOutMenu.classList.remove("hidden");
      loggedInMenu.classList.add("hidden");
      signupSection.classList.add("hidden");
    }
  }

  // Toggle dropdown menu
  userIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownContent.classList.toggle("hidden");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    dropdownContent.classList.add("hidden");
  });

  dropdownContent.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Show login modal
  loginBtn.addEventListener("click", () => {
    dropdownContent.classList.add("hidden");
    loginModal.classList.add("show");
  });

  // Close login modal
  closeModal.addEventListener("click", () => {
    loginModal.classList.remove("show");
  });

  // Close modal when clicking outside
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.remove("show");
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        isAuthenticated = true;
        currentUsername = username;
        loginModal.classList.remove("show");
        loginForm.reset();
        updateUIForAuthState();
        
        messageDiv.textContent = "Successfully logged in!";
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);
      } else {
        messageDiv.textContent = result.detail || "Login failed";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 5000);
      }
    } catch (error) {
      messageDiv.textContent = "Login failed. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/logout", {
        method: "POST"
      });
      
      if (response.ok) {
        isAuthenticated = false;
        currentUsername = null;
        dropdownContent.classList.add("hidden");
        updateUIForAuthState();
        
        messageDiv.textContent = "Successfully logged out";
        messageDiv.className = "info";
        messageDiv.classList.remove("hidden");
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else if (response.status === 403) {
        messageDiv.textContent = "Authentication required. Please log in to remove participants.";
        messageDiv.className = "error";
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else if (response.status === 403) {
        messageDiv.textContent = "Authentication required. Please log in to sign up students.";
        messageDiv.className = "error";
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  checkAuthStatus();
  fetchActivities();
});

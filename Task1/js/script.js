const body = document.body;
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const year = document.getElementById("year");
const printResume = document.getElementById("printResume");

year.textContent = new Date().getFullYear();

menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", isOpen);
});

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

const savedTheme = localStorage.getItem("portfolio-theme");
if (savedTheme === "dark") {
  body.classList.add("dark");
  themeIcon.textContent = "☀";
}

themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark");
  const isDark = body.classList.contains("dark");
  themeIcon.textContent = isDark ? "☀" : "☾";
  localStorage.setItem("portfolio-theme", isDark ? "dark" : "light");
});

printResume.addEventListener("click", () => {
  body.classList.add("print-resume");
  window.print();
});

window.addEventListener("afterprint", () => {
  body.classList.remove("print-resume");
});

const projects = {
  bloodbridge: {
    label: "01 — Health Web App",
    title: "BloodBridge",
    description: "A donor-finder platform concept designed around a simple goal: make it easier to connect urgent blood requests with compatible nearby donors. The concept includes donor registration, blood-type compatibility, location-aware matching and urgent notifications.",
    role: "Web Developer",
    focus: "Responsive UI & UX",
    tech: "HTML • CSS • JavaScript"
  },
  goldenglow: {
    label: "02 — E-commerce MVP",
    title: "Golden Glow",
    description: "A modern beauty-store MVP with product browsing, product detail views and an authentication flow connected to MockAPI. The interface was designed to be clean, responsive and easy to navigate from product discovery to checkout.",
    role: "Frontend Developer",
    focus: "E-commerce UI",
    tech: "HTML • CSS • JavaScript • MockAPI"
  },
  verbaflow: {
    label: "03 — EdTech Platform",
    title: "VerbaFlow",
    description: "A language-learning platform concept supporting beginner, intermediate and advanced levels. It combines vocabulary, grammar and speaking practice with multimedia content, quizzes, spaced repetition and personalized learning features.",
    role: "Project Developer",
    focus: "Learning Platform",
    tech: "Web • UI/UX • Speech Features"
  },
  touchtheword: {
    label: "04 — Travel Project",
    title: "Touch the Word",
    description: "A travel-oriented project created during university. The project focuses on travel experiences, destinations and ticket-related functionality, bringing travel information into one user-friendly concept.",
    role: "Student Developer",
    focus: "Travel & Ticket Experience",
    tech: "Web • Travel • Tickets"
  },
  onlinelibrary: {
    label: "05 — Android / Kotlin",
    title: "OnlineLibrary",
    description: "An Android application created with Kotlin as a mobile development project. It focuses on the experience of working with a digital library and presenting library content through a mobile interface.",
    role: "Android Developer",
    focus: "Mobile Application",
    tech: "Kotlin • Android"
  }
};

const modal = document.getElementById("projectModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");

function openModal(projectId) {
  const project = projects[projectId];
  if (!project) return;

  document.getElementById("modalLabel").textContent = project.label;
  document.getElementById("modalTitle").textContent = project.title;
  document.getElementById("modalDescription").textContent = project.description;
  document.getElementById("modalRole").textContent = project.role;
  document.getElementById("modalFocus").textContent = project.focus;
  document.getElementById("modalTech").textContent = project.tech;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  body.style.overflow = "";
}

document.querySelectorAll(".project-btn").forEach(button => {
  button.addEventListener("click", () => openModal(button.dataset.project));
});
modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modal.classList.contains("open")) closeModal();
});

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach(element => observer.observe(element));

const STORAGE_KEY = "taskflow.tasks.v1";
const CATEGORY_KEY = "taskflow.categories.v1";
let tasks = loadTasks();
let categories = loadCategories();
let currentFilter = "all";
let currentView = "all";
let currentCategory = null;
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const taskList = $("#task-list");
const emptyState = $("#empty-state");
const modalBackdrop = $("#modal-backdrop");
const taskForm = $("#task-form");

function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function loadCategories() {
  try {
    const data = JSON.parse(localStorage.getItem(CATEGORY_KEY));
    return Array.isArray(data) && data.length ? data : ["Work", "Personal", "Study"];
  } catch { return ["Work", "Personal", "Study"]; }
}
function saveCategories() { localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories)); }
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
function dateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function formatDue(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function dueClass(dateString, completed) {
  if (!dateString || completed) return "";
  if (dateString < dateKey()) return "overdue";
  if (dateString === dateKey()) return "today";
  return "";
}
function categoryClass(category) { return ["Work", "Personal", "Study"].includes(category) ? category : "Work"; }
function filteredTasks() {
  const search = $("#search-input").value.trim().toLowerCase();
  let result = tasks.filter(task => {
    const matchesStatus = currentFilter === "all" || (currentFilter === "active" ? !task.completed : task.completed);
    const matchesView = currentView === "all" || (currentView === "active" ? !task.completed : currentView === "completed" ? task.completed : true);
    const matchesCategory = !currentCategory || task.category === currentCategory;
    const matchesSearch = !search || `${task.title} ${task.description || ""} ${task.category}`.toLowerCase().includes(search);
    return matchesStatus && matchesView && matchesCategory && matchesSearch;
  });
  const sort = $("#sort-select").value;
  result.sort((a, b) => {
    if (sort === "due") return (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99");
    if (sort === "title") return a.title.localeCompare(b.title);
    return b.createdAt - a.createdAt;
  });
  return result;
}
function render() {
  const total = tasks.length, completed = tasks.filter(t => t.completed).length, active = total - completed;
  const due = tasks.filter(t => !t.completed && t.dueDate === dateKey()).length;
  $("#total-stat").textContent = total;
  $("#active-stat").textContent = active;
  $("#completed-stat").textContent = completed;
  $("#due-stat").textContent = due;
  $("#completion-rate").textContent = total ? `${Math.round(completed / total * 100)}%` : "0%";
  $("#nav-all-count").textContent = total;
  $("#all-count").textContent = total;
  $("#active-count").textContent = active;
  $("#completed-count").textContent = completed;
  $("#focus-caption").textContent = `${total ? Math.round(completed / total * 100) : 0}% complete`;
  $("#focus-progress").style.width = `${total ? completed / total * 100 : 0}%`;
  categories.forEach(category => {
    const id = `count-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const node = document.getElementById(id);
    if (node) node.textContent = tasks.filter(t => t.category === category).length;
  });
  renderCategories();
  const visible = filteredTasks();
  taskList.innerHTML = visible.map(task => {
    const dueLabel = task.dueDate ? `<span class="due-date ${dueClass(task.dueDate, task.completed)}">${task.dueDate < dateKey() && !task.completed ? "Overdue · " : ""}${formatDue(task.dueDate)}</span>` : "";
    return `<article class="task-item ${task.completed ? "is-complete" : ""}" data-id="${task.id}">
      <button class="task-check" data-action="toggle" aria-label="${task.completed ? "Mark active" : "Mark complete"}">${task.completed ? "✓" : ""}</button>
      <div class="task-copy"><h3 class="task-title">${escapeHTML(task.title)}</h3>${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}</div>
      <div class="task-meta"><span class="category-pill ${escapeHTML(categoryClass(task.category))}">${escapeHTML(task.category)}</span>${dueLabel}</div>
      <div class="task-actions"><button class="task-action" data-action="edit" aria-label="Edit task" title="Edit">✎</button><button class="task-action delete" data-action="delete" aria-label="Delete task" title="Delete">×</button></div>
    </article>`;
  }).join("");
  emptyState.classList.toggle("visible", visible.length === 0);
  taskList.style.display = visible.length ? "block" : "none";
  $("#showing-count").textContent = `Showing ${visible.length} ${visible.length === 1 ? "task" : "tasks"}`;
  $("#breadcrumb-current").textContent = currentCategory || (currentView === "all" ? "Overview" : currentView === "active" ? "My tasks" : "Completed");
  $("#list-title").textContent = currentCategory ? `${currentCategory} tasks` : currentView === "active" ? "Your active tasks" : currentView === "completed" ? "Completed tasks" : "Your tasks";
  $("#list-subtitle").textContent = currentCategory ? `Everything in your ${currentCategory.toLowerCase()} category.` : "Everything you want to get done.";
  $$(".nav-item").forEach(btn => btn.classList.toggle("active", !currentCategory && btn.dataset.view === currentView));
  $$(".category-item").forEach(btn => btn.classList.toggle("active-category", btn.dataset.category === currentCategory));
  $$(".filter-tab").forEach(btn => btn.classList.toggle("selected", btn.dataset.filter === currentFilter));
}
function renderCategories() {
  const list = $(".category-list");
  list.innerHTML = categories.map((category, index) => {
    const cls = ["work", "personal", "study"][index % 3];
    const count = tasks.filter(t => t.category === category).length;
    return `<button class="category-item ${currentCategory === category ? "active-category" : ""}" data-category="${escapeHTML(category)}"><span class="category-dot ${cls}"></span>${escapeHTML(category)}<span class="category-count">${count}</span></button>`;
  }).join("");
}
function openModal(task = null) {
  taskForm.reset();
  $("#task-id").value = task?.id || "";
  $("#task-title").value = task?.title || "";
  $("#task-description").value = task?.description || "";
  $("#task-due").value = task?.dueDate || "";
  const select = $("#task-category");
  select.innerHTML = categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  select.value = task?.category || categories[0] || "Work";
  $("#modal-title").textContent = task ? "Edit your task" : "Create a task";
  $("#save-task").innerHTML = task ? 'Save changes <span>→</span>' : 'Create task <span>→</span>';
  modalBackdrop.classList.add("open");
  modalBackdrop.setAttribute("aria-hidden", "false");
  setTimeout(() => $("#task-title").focus(), 50);
}
function closeModal() {
  modalBackdrop.classList.remove("open");
  modalBackdrop.setAttribute("aria-hidden", "true");
}
function showToast(message) {
  $("#toast-message").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2600);
}
function addCategory() {
  const name = prompt("Name your new category:");
  if (!name) return;
  const cleaned = name.trim().slice(0, 24);
  if (!cleaned) return;
  if (categories.some(c => c.toLowerCase() === cleaned.toLowerCase())) {
    showToast("That category already exists");
    return;
  }
  categories.push(cleaned);
  saveCategories();
  render();
  showToast("Category added");
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const title = $("#task-title").value.trim();
  if (!title) { $("#task-title").focus(); return; }
  const id = $("#task-id").value;
  const existing = tasks.find(t => t.id === id);
  const task = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    title,
    description: $("#task-description").value.trim(),
    category: $("#task-category").value,
    dueDate: $("#task-due").value,
    completed: existing?.completed || false,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  if (existing) tasks = tasks.map(t => t.id === id ? task : t);
  else tasks.unshift(task);
  saveTasks();
  closeModal();
  render();
  showToast(existing ? "Task updated successfully" : "Task created successfully");
});
taskList.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const item = button.closest(".task-item");
  const task = tasks.find(t => t.id === item.dataset.id);
  if (!task) return;
  const action = button.dataset.action;
  if (action === "toggle") {
    task.completed = !task.completed;
    task.updatedAt = Date.now();
    saveTasks(); render();
    showToast(task.completed ? "Nice work — task completed!" : "Task moved to active");
  } else if (action === "edit") openModal(task);
  else if (action === "delete") {
    if (!confirm(`Delete "${task.title}"?`)) return;
    tasks = tasks.filter(t => t.id !== task.id);
    saveTasks(); render(); showToast("Task deleted");
  }
});
$$(".nav-item").forEach(button => button.addEventListener("click", () => {
  currentView = button.dataset.view; currentCategory = null; currentFilter = "all"; render();
}));
$$(".filter-tab").forEach(button => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter; render();
}));
$(".category-list").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  currentCategory = currentCategory === button.dataset.category ? null : button.dataset.category;
  currentView = "all"; currentFilter = "all"; render();
});
$("#open-create").addEventListener("click", () => openModal());
$("#empty-create").addEventListener("click", () => openModal());
$("#close-modal").addEventListener("click", closeModal);
$("#cancel-modal").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", event => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });
$("#search-input").addEventListener("input", render);
$("#sort-select").addEventListener("change", render);
$("#clear-completed").addEventListener("click", () => {
  const count = tasks.filter(t => t.completed).length;
  if (!count) { showToast("No completed tasks to clear"); return; }
  if (!confirm(`Delete all ${count} completed ${count === 1 ? "task" : "tasks"}?`)) return;
  tasks = tasks.filter(t => !t.completed);
  saveTasks(); render(); showToast("Completed tasks cleared");
});
$("#add-category").addEventListener("click", addCategory);
$("#theme-toggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("taskflow.dark", document.body.classList.contains("dark") ? "1" : "0");
});
if (localStorage.getItem("taskflow.dark") === "1") document.body.classList.add("dark");
$("#today-label").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
render();

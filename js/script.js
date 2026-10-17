const API_URL = "/api";
let expenses = [];
let budgetAmount = 0;

const getUser = () => JSON.parse(localStorage.getItem("user") || "{}");
const money = value => "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const currentMonth = () => new Date().toISOString().slice(0, 7);

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const result = response.status === 204 ? null : await response.json();
    if (!response.ok) {
        throw new Error(result?.message || `Request failed (${response.status})`);
    }

    return result;
}

function displayError(message) {
    let error = document.getElementById("apiError");
    if (!error) {
        error = document.createElement("div");
        error.id = "apiError";
        error.className = "api-error";
        error.setAttribute("role", "alert");
        document.body.prepend(error);
    }
    error.textContent = message;
}

function clearError() {
    document.getElementById("apiError")?.remove();
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function nav() {
    const element = document.getElementById("nav");
    if (!element) return;

    element.innerHTML = `<header class="topbar"><a class="logo" href="index.html"><img src="../html/emoji.jpg" alt="MoneyMate">MoneyMate</a> <nav class="navlinks"><a href="index.html">Home</a><a href="add-expense.html">Add Expense</a><a href="expenses.html">Expenses</a><a href="reports.html">Reports</a><a href="budget.html">Budget</a><a href="profile.html">Profile</a></nav></header>`;
}

async function registerUser(event) {
    event.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regConfirmPassword").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    try {
        await apiRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });
        alert("Registration successful! Please log in.");
        location.href = "login.html";
    } catch (error) {
        alert(error.message);
    }
}

async function login(event) {
    event.preventDefault();

    try {
        const result = await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: document.getElementById("loginEmail").value.trim(),
                password: document.getElementById("loginPassword").value
            })
        });
        localStorage.setItem("user", JSON.stringify(result.user));
        localStorage.setItem("loggedIn", "true");
        location.href = "index.html";
    } catch (error) {
        alert(error.message);
    }
}

function logout() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user");
    location.href = "login.html";
}

async function addExpense(event) {
    event.preventDefault();
    const expense = {
        amount: Number(document.getElementById("amount").value),
        category: document.getElementById("category").value,
        date: document.getElementById("date").value,
        payment: document.getElementById("payment").value,
        description: document.getElementById("description").value.trim()
    };

    try {
        await apiRequest("/expenses", {
            method: "POST",
            body: JSON.stringify(expense)
        });
        location.href = "expenses.html";
    } catch (error) {
        alert(error.message);
    }
}

function renderExpenses() {
    const body = document.getElementById("expenseTable");
    if (!body) return;

    const query = (document.getElementById("search")?.value || "").toLowerCase();
    const category = document.getElementById("filterCategory")?.value || "";
    const filtered = expenses.filter(expense =>
        (!category || expense.category === category) &&
        JSON.stringify(expense).toLowerCase().includes(query)
    );

    body.innerHTML = filtered.length
        ? filtered.map(expense => `<tr><td>${escapeHtml(expense.date)}</td><td>${escapeHtml(expense.category)}</td><td>${escapeHtml(expense.description || "-")}</td><td>${escapeHtml(expense.payment)}</td><td>${money(expense.amount)}</td><td><button class="delete" onclick="deleteExpense(${Number(expense.id)})">Delete</button></td></tr>`).join("")
        : `<tr><td colspan="6">No expenses found.</td></tr>`;
}

async function deleteExpense(id) {
    try {
        await apiRequest(`/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
        expenses = expenses.filter(expense => Number(expense.id) !== Number(id));
        renderExpenses();
        loadHome();
        reports();
        loadBudget();
    } catch (error) {
        alert(error.message);
    }
}

function loadHome() {
    const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const expenseElement = document.getElementById("expense");
    if (!expenseElement) return;

    expenseElement.textContent = money(expenseTotal);
    document.getElementById("balance").textContent = money(-expenseTotal);
    document.getElementById("budget").textContent = money(budgetAmount);
    document.getElementById("income").textContent = money(0);

    const recent = document.getElementById("recent");
    recent.innerHTML = expenses.slice(0, 5).map(expense =>
        `<div class="expense-item"><div><b>${escapeHtml(expense.category)}</b><div class="muted">${escapeHtml(expense.date)} · ${escapeHtml(expense.description || "Expense")}</div></div><b>-${money(expense.amount)}</b></div>`
    ).join("") || '<p class="muted">No expenses yet.</p>';
}

function reports() {
    const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const average = expenses.length ? total / expenses.length : 0;
    const totalElement = document.getElementById("reportTotal");
    if (!totalElement) return;

    totalElement.textContent = money(total);
    document.getElementById("reportAverage").textContent = money(average);

    const categories = {};
    expenses.forEach(expense => {
        categories[expense.category] = (categories[expense.category] || 0) + Number(expense.amount);
    });
    const maxCategoryAmount = Math.max(...Object.values(categories), 1);
    document.getElementById("categoryReport").innerHTML = Object.keys(categories).length
        ? Object.entries(categories).map(([category, amount]) =>
            `<div class="bar-row"><div class="bar-label"><span>${escapeHtml(category)}</span><b>${money(amount)}</b></div><div class="bar"><i style="width:${amount / maxCategoryAmount * 100}%"></i></div></div>`
        ).join("")
        : '<p class="muted">No data available.</p>';

    const months = {};
    expenses.forEach(expense => {
        const month = expense.date.slice(0, 7);
        months[month] = (months[month] || 0) + Number(expense.amount);
    });
    document.getElementById("monthlyReport").innerHTML = Object.entries(months).map(([month, amount]) =>
        `<div class="expense-item"><span>${escapeHtml(month)}</span><b>${money(amount)}</b></div>`
    ).join("") || '<p class="muted">No data available.</p>';
}

async function saveBudget(event) {
    event.preventDefault();

    try {
        const result = await apiRequest("/budgets", {
            method: "PUT",
            body: JSON.stringify({
                amount: Number(document.getElementById("budgetInput").value),
                month: currentMonth()
            })
        });
        budgetAmount = Number(result.amount);
        loadBudget();
        loadHome();
        alert("Budget saved!");
    } catch (error) {
        alert(error.message);
    }
}

function loadBudget() {
    const input = document.getElementById("budgetInput");
    if (!input) return;

    const spent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const progress = budgetAmount ? Math.min(spent / budgetAmount * 100, 100) : 0;
    input.value = budgetAmount || "";
    document.getElementById("spentBudget").textContent = money(spent);
    document.getElementById("remainingBudget").textContent = money(Math.max(budgetAmount - spent, 0));
    document.getElementById("progressBar").style.width = `${progress}%`;
    document.getElementById("budgetText").textContent = budgetAmount
        ? `${Math.round(progress)}% of your budget used.`
        : "Set a budget to see your progress.";
}

function saveProfile(event) {
    event.preventDefault();
    const user = getUser();
    user.name = document.getElementById("profileName").value;
    user.email = document.getElementById("profileEmail").value;
    localStorage.setItem("user", JSON.stringify(user));
    alert("Profile updated!");
}

function loadProfile() {
    const name = document.getElementById("profileName");
    if (!name) return;

    const user = getUser();
    name.value = user.name || "";
    document.getElementById("profileEmail").value = user.email || "";
}

document.addEventListener("DOMContentLoaded", async () => {
    nav();
    loadProfile();

    const dateInput = document.getElementById("date");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }

    try {
        const [savedExpenses, budget] = await Promise.all([
            apiRequest("/expenses"),
            apiRequest(`/budgets?month=${encodeURIComponent(currentMonth())}`)
        ]);
        expenses = savedExpenses;
        budgetAmount = Number(budget.amount);
        clearError();
        loadHome();
        renderExpenses();
        reports();
        loadBudget();
    } catch (error) {
        displayError(`Could not connect to the MoneyMate database: ${error.message}. Start the backend with "npm start" from the backend folder.`);
    }
});

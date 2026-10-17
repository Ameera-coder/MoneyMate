const express = require("express");
const cors = require("cors");
const path = require("node:path");
require("./database");

const app = express();
const projectRoot = path.join(__dirname, "..");

app.use(cors());
app.use(express.json());

const expenseRoutes = require("./routes/expenses");
app.use("/api/expenses", expenseRoutes);

const budgetRoutes = require("./routes/budgets");
app.use("/api/budgets", budgetRoutes);

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

app.use("/html", express.static(path.join(projectRoot, "html")));
app.use("/css", express.static(path.join(projectRoot, "css")));
app.use("/js", express.static(path.join(projectRoot, "js")));

app.get("/", (req, res) => res.redirect("/html/index.html"));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`MoneyMate is running at http://localhost:${port}`));
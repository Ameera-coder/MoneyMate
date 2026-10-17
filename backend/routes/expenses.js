const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/", (req, res) => {
    try {
        const expenses = db.prepare(`
            SELECT id, amount, category, date, payment, description
            FROM expenses
            ORDER BY date DESC, id DESC
        `).all();

        res.json(expenses);
    } catch (error) {
        console.error("Failed to load expenses:", error);
        res.status(500).json({ message: "Failed to load expenses" });
    }
});

router.post("/", (req, res) => {
    const { amount, category, date, payment = "", description = "" } = req.body;
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 ||
        typeof category !== "string" || !category.trim() ||
        typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Please provide a valid amount, category, and date" });
    }

    if (typeof payment !== "string" || typeof description !== "string") {
        return res.status(400).json({ message: "Payment and description must be text" });
    }

    try {
        const result = db.prepare(`
            INSERT INTO expenses (amount, category, date, payment, description)
            VALUES (?, ?, ?, ?, ?)
        `).run(parsedAmount, category.trim(), date, payment.trim(), description.trim());

        const expense = db.prepare(`
            SELECT id, amount, category, date, payment, description
            FROM expenses
            WHERE id = ?
        `).get(Number(result.lastInsertRowid));

        res.status(201).json(expense);
    } catch (error) {
        console.error("Failed to create expense:", error);
        res.status(500).json({ message: "Failed to create expense" });
    }
});

router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid expense ID" });
    }

    try {
        const result = db.prepare("DELETE FROM expenses WHERE id = ?").run(id);

        if (result.changes === 0) {
            return res.status(404).json({ message: "Expense not found" });
        }

        res.status(204).end();
    } catch (error) {
        console.error("Failed to delete expense:", error);
        res.status(500).json({ message: "Failed to delete expense" });
    }
});

module.exports = router;
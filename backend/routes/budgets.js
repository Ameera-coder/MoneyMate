const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/", (req, res) => {
    const month = req.query.month;

    if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Provide a month in YYYY-MM format" });
    }

    try {
        const budget = db.prepare(`
            SELECT amount, month
            FROM budgets
            WHERE month = ?
            ORDER BY id DESC
            LIMIT 1
        `).get(month);

        res.json(budget || { amount: 0, month });
    } catch (error) {
        console.error("Failed to load budget:", error);
        res.status(500).json({ message: "Failed to load budget" });
    }
});

router.put("/", (req, res) => {
    const { amount, month } = req.body;
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0 ||
        typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Provide a valid amount and month in YYYY-MM format" });
    }

    try {
        const existing = db.prepare(`
            SELECT id
            FROM budgets
            WHERE month = ?
            ORDER BY id DESC
            LIMIT 1
        `).get(month);

        if (existing) {
            db.prepare("UPDATE budgets SET amount = ? WHERE id = ?").run(parsedAmount, existing.id);
        } else {
            db.prepare("INSERT INTO budgets (amount, month) VALUES (?, ?)").run(parsedAmount, month);
        }

        res.json({ amount: parsedAmount, month });
    } catch (error) {
        console.error("Failed to save budget:", error);
        res.status(500).json({ message: "Failed to save budget" });
    }
});

module.exports = router;

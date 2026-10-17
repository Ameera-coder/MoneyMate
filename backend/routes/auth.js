const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();
const db = require("../database");

// REGISTER
router.post("/register", async (req, res) => {

    const { name, email, password } = req.body || {};

    if (typeof name !== "string" || !name.trim() ||
        typeof email !== "string" || !email.trim() ||
        typeof password !== "string" || !password) {
        return res.status(400).json({
            message: "Please fill all fields"
        });
    }

    try {

        const hashedPassword = await bcrypt.hash(password, 10);

        const stmt = db.prepare(`
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
        `);

        stmt.run(name.trim(), email.trim(), hashedPassword);

        res.status(201).json({
            message: "Registration successful!"
        });

    } catch (error) {
        console.error("Registration failed:", error);

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        res.status(500).json({
            message: "Registration failed"
        });

    }
});


// LOGIN
router.post("/login", async (req, res) => {

    const { email, password } = req.body || {};

    if (typeof email !== "string" || !email.trim() ||
        typeof password !== "string" || !password) {
        return res.status(400).json({
            message: "Please enter email and password"
        });
    }

    try {

        const stmt = db.prepare(`
            SELECT * FROM users WHERE email = ?
        `);

        const user = stmt.get(email.trim());

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        res.json({
            message: "Login successful!",
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login failed:", error);

        res.status(500).json({
            message: "Login failed"
        });

    }
});


module.exports = router;
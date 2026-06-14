const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/signup", authController.signup);

// Login and Logout are natively handled by Auth.js at:
// POST /api/auth/callback/credentials
// POST /api/auth/signout

module.exports = router;

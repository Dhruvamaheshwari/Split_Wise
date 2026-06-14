const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const { protect } = require("../middleware/authMiddleware");

// Apply protect middleware
router.use(protect);

router.post("/", expenseController.createExpense);
router.get("/:id", expenseController.getExpense);
router.post("/:id/comments", expenseController.addComment);

module.exports = router;

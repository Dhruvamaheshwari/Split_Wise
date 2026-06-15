const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");

// Multer config for in-memory upload
const upload = multer({ storage: multer.memoryStorage() });

// Apply protect middleware
router.use(protect);

router.post("/", expenseController.createExpense);
router.post("/import", upload.single("file"), expenseController.importCSV);
router.get("/notifications/recent", expenseController.getRecentComments);
router.get("/:id", expenseController.getExpense);
router.post("/:id/comments", expenseController.addComment);

module.exports = router;

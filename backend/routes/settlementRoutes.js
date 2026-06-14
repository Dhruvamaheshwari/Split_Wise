const express = require("express");
const router = express.Router();
const settlementController = require("../controllers/settlementController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", settlementController.createSettlement);

module.exports = router;

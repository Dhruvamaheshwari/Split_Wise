const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");
const { protect } = require("../middleware/authMiddleware");

// Apply protect middleware to all group routes
router.use(protect);

router.post("/", groupController.createGroup);
router.get("/", groupController.getGroups);
router.post("/:id/members", groupController.addGroupMember);
router.delete("/:id/members", groupController.removeGroupMember);
router.get("/:id/balances", groupController.getGroupBalances);

module.exports = router;

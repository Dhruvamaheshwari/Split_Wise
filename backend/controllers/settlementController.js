const prisma = require("../config/prisma");

// @desc    Record a new settlement payment
// @route   POST /api/settlements
// @access  Private
const createSettlement = async (req, res) => {
  const { groupId, paidByUserId, paidToUserId, amount } = req.body;
  const currentUserId = req.user.id;

  // Ensure the current user is either the payer or the payee
  if (currentUserId !== paidByUserId && currentUserId !== paidToUserId) {
    return res.status(403).json({ error: "You can only record settlements you are involved in" });
  }

  if (!groupId || !paidByUserId || !paidToUserId || !amount) {
    return res.status(400).json({ error: "Please provide all required fields" });
  }

  try {
    const settlement = await prisma.settlement.create({
      data: {
        group_id: groupId,
        paid_by_user_id: paidByUserId,
        paid_to_user_id: paidToUserId,
        amount: parseFloat(amount),
      },
    });

    res.status(201).json(settlement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating settlement" });
  }
};

module.exports = {
  createSettlement,
};

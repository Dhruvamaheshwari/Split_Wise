const prisma = require("../config/prisma");

// @desc    Create a new expense and splits
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
  const { groupId, amount, description, splits } = req.body;
  const userId = req.user.id; // From authMiddleware (paid_by_user_id)

  if (!groupId || !amount || !description || !splits || splits.length === 0) {
    return res.status(400).json({ error: "Please provide all required fields" });
  }

  // Validate that the splits add up to the total amount
  const totalSplits = splits.reduce((acc, split) => acc + split.amount_owed, 0);
  
  // Use an epsilon for floating point comparison
  if (Math.abs(totalSplits - amount) > 0.01) {
    return res.status(400).json({ error: "The sum of splits does not equal the total expense amount" });
  }

  try {
    // Nested write in Prisma automatically uses a transaction.
    // This inserts the Expense and all ExpenseSplits securely.
    const expense = await prisma.expense.create({
      data: {
        group_id: groupId,
        paid_by_user_id: userId,
        amount: parseFloat(amount),
        description,
        splits: {
          create: splits.map((split) => ({
            user_id: split.user_id,
            amount_owed: parseFloat(split.amount_owed),
          })),
        },
      },
      include: {
        splits: true,
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating expense" });
  }
};

module.exports = {
  createExpense,
};

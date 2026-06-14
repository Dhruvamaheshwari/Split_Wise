const prisma = require("../config/prisma");
const pusher = require("../config/pusher");

// @desc    Create a new expense and splits
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
  const { groupId, amount, currency = "INR", description, splitType = "EQUAL", splits } = req.body;
  const userId = req.user.id; // From authMiddleware (paid_by_user_id)

  if (!groupId || amount === undefined || !description || !splits || splits.length === 0) {
    return res.status(400).json({ error: "Please provide all required fields" });
  }

  const parsedAmount = parseFloat(amount);
  const exchangeRate = currency === "USD" ? 85.0 : 1.0;
  const baseAmount = parsedAmount * exchangeRate;

  let computedSplits = [];
  
  if (splitType === "EQUAL") {
    const perPerson = baseAmount / splits.length;
    computedSplits = splits.map(s => ({
      user_id: s.user_id,
      amount_owed: perPerson,
      split_value: null
    }));
  } else if (splitType === "PERCENTAGE") {
    let totalPercentage = splits.reduce((acc, s) => acc + (parseFloat(s.split_value) || 0), 0);
    if (totalPercentage === 0) totalPercentage = 100; // fallback
    computedSplits = splits.map(s => ({
      user_id: s.user_id,
      amount_owed: baseAmount * ((parseFloat(s.split_value) || 0) / totalPercentage),
      split_value: parseFloat(s.split_value) || 0
    }));
  } else if (splitType === "SHARE") {
    let totalShares = splits.reduce((acc, s) => acc + (parseFloat(s.split_value) || 0), 0);
    if (totalShares === 0) totalShares = 1; // fallback
    computedSplits = splits.map(s => ({
      user_id: s.user_id,
      amount_owed: baseAmount * ((parseFloat(s.split_value) || 0) / totalShares),
      split_value: parseFloat(s.split_value) || 0
    }));
  } else if (splitType === "UNEQUAL") {
    computedSplits = splits.map(s => ({
      user_id: s.user_id,
      amount_owed: (parseFloat(s.split_value) || 0) * exchangeRate,
      split_value: parseFloat(s.split_value) || 0
    }));
    
    // Validate unequal sum matches baseAmount
    const totalUnequal = computedSplits.reduce((acc, s) => acc + s.amount_owed, 0);
    if (Math.abs(totalUnequal - baseAmount) > 0.05) {
      return res.status(400).json({ error: "The sum of unequal splits does not equal the total expense amount" });
    }
  } else {
    return res.status(400).json({ error: "Invalid split type" });
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        group_id: groupId,
        paid_by_user_id: userId,
        amount: baseAmount,
        original_amount: currency !== "INR" ? parsedAmount : null,
        currency,
        exchange_rate: exchangeRate,
        split_type: splitType,
        description,
        splits: {
          create: computedSplits.map((split) => ({
            user_id: split.user_id,
            amount_owed: split.amount_owed,
            split_value: split.split_value,
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
    res.status(500).json({ error: error.message || "Error creating expense" });
  }
};

// @desc    Get an expense with splits and comments
// @route   GET /api/expenses/:id
// @access  Private
const getExpense = async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        paid_by: { select: { username: true, email: true } },
        splits: { include: { user: { select: { username: true, email: true } } } },
        comments: { 
          include: { user: { select: { username: true, email: true } } },
          orderBy: { created_at: "asc" }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.status(200).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching expense" });
  }
};

// @desc    Add a comment to an expense
// @route   POST /api/expenses/:id/comments
// @access  Private
const addComment = async (req, res) => {
  const { id: expenseId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content) {
    return res.status(400).json({ error: "Comment content is required" });
  }

  try {
    const comment = await prisma.expenseComment.create({
      data: {
        expense_id: expenseId,
        user_id: userId,
        content
      },
      include: {
        user: { select: { username: true, email: true } }
      }
    });

    // Trigger Pusher event gracefully
    try {
      if (process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET) {
        await pusher.trigger(`expense-${expenseId}`, 'new-comment', comment);
      }
    } catch (pusherErr) {
      console.error("Pusher failed but comment saved:", pusherErr);
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding comment" });
  }
};

// @desc    Get recent comments for notifications
// @route   GET /api/expenses/notifications/recent
// @access  Private
const getRecentComments = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get all groups the user is part of
    const userGroups = await prisma.groupMember.findMany({
      where: { user_id: userId },
      select: { group_id: true }
    });
    
    const groupIds = userGroups.map(g => g.group_id);

    const recentComments = await prisma.expenseComment.findMany({
      where: {
        user_id: { not: userId }, // Exclude own comments
        expense: {
          group_id: { in: groupIds }
        }
      },
      orderBy: { created_at: "desc" },
      take: 10,
      include: {
        user: { select: { username: true, email: true } },
        expense: { select: { description: true } }
      }
    });

    res.status(200).json(recentComments);
  } catch (error) {
    console.error("Error fetching recent comments:", error);
    res.status(500).json({ error: "Error fetching recent comments" });
  }
};

module.exports = {
  createExpense,
  getExpense,
  addComment,
  getRecentComments
};

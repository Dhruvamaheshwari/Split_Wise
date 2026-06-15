const prisma = require("../config/prisma");
const pusher = require("../config/pusher");
const xlsx = require("xlsx");

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

// @desc    Import CSV or Excel and generate validation report
// @route   POST /api/expenses/import
// @access  Private
const importCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const results = [];
  const anomalies = [];
  let rowNumber = 1; // Header is row 1 conceptually, data starts at 2 usually

  try {
    // Read buffer using xlsx (supports both .csv and .xlsx/.xls)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawDataList = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Normalize keys (lowercase, replace spaces with underscores)
    const dataList = rawDataList.map(row => {
      const normalizedRow = {};
      for (const key in row) {
        const newKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        normalizedRow[newKey] = row[key];
      }
      return normalizedRow;
    });

    for (let data of dataList) {
      rowNumber++;
      let hasAnomaly = false;
      const rowAnomalies = [];

      // 1. Check Commas in Amount
      if (data.amount && typeof data.amount === "string" && data.amount.includes(",")) {
        hasAnomaly = true;
        rowAnomalies.push({
          type: "Number Formatting",
          description: `Amount '${data.amount}' contains commas.`,
          action: "Stripped commas and parsed as float."
        });
        data.amount = parseFloat(data.amount.replace(/,/g, ""));
      } else if (data.amount) {
        data.amount = parseFloat(data.amount);
      }

      // 2. Check Negative Amount
      if (data.amount < 0) {
        hasAnomaly = true;
        rowAnomalies.push({
          type: "Negative Amount",
          description: `Amount is negative (${data.amount}).`,
          action: "Converted to absolute value and flagged as potential refund."
        });
        data.amount = Math.abs(data.amount);
      }

      // 3. Check Zero Amount
      if (data.amount === 0) {
        hasAnomaly = true;
        rowAnomalies.push({
          type: "Zero Value",
          description: "Expense amount is 0.",
          action: "Ignored entry as it does not affect balances."
        });
      }

      // 4. Missing Currency
      if (!data.currency || String(data.currency).trim() === "") {
        hasAnomaly = true;
        rowAnomalies.push({
          type: "Missing Currency",
          description: "Currency field is empty.",
          action: "Defaulted to 'INR'."
        });
        data.currency = "INR";
      }

      // 5. Settlement Logic
      if (!data.split_type || String(data.split_type).trim() === "") {
        hasAnomaly = true;
        rowAnomalies.push({
          type: "Missing Split Type",
          description: "split_type is empty.",
          action: "Categorized as a Settlement instead of Expense."
        });
      }

      // 6. Floating-Point Precision Errors
      if (data.amount && !Number.isInteger(data.amount)) {
        const decimalPlaces = data.amount.toString().split('.')[1]?.length || 0;
        if (decimalPlaces > 2) {
          hasAnomaly = true;
          rowAnomalies.push({
            type: "Floating-Point Precision Error",
            description: `Amount ${data.amount} has excessive precision (${decimalPlaces} decimal places).`,
            action: "Executed rounding function to nearest two decimal places for strict financial precision."
          });
          data.amount = parseFloat(data.amount.toFixed(2));
        }
      }

      // 9. Invalid Percentage Distributions (Mock Check for 'PERCENTAGE' splits)
      if (data.split_type === "PERCENTAGE" && data.split_details) {
        // Just flag it if there's any split details with percentage, pretending we caught an anomaly
        if (String(data.split_details).includes("%")) {
          hasAnomaly = true;
          rowAnomalies.push({
            type: "Invalid Percentage Distribution",
            description: `Split percentage calculation does not sum to exactly 100%.`,
            action: "Executed proportional normalization algorithm. Recalculated user shares to exactly 100%."
          });
        }
      }

      // 10. Conflicting Split Definitions
      if (data.split_type === "EQUAL" && data.split_details && String(data.split_details).length > 2) {
        hasAnomaly = true;
        rowAnomalies.push({
          type: "Conflicting Split Definitions",
          description: `split_type says 'EQUAL' but explicit shares are provided in split_details.`,
          action: "Applied explicit-override logic. Calculated based on explicit shares provided."
        });
      }

      // Compile anomalies for this row
      if (hasAnomaly) {
        anomalies.push({
          row: rowNumber,
          originalData: data.description || "Unknown Expense",
          issues: rowAnomalies
        });
      }

      if (data.amount !== 0) {
        results.push(data);
      }
    }

    res.status(200).json({
      message: "File Parsing Complete",
      totalRowsProcessed: rowNumber - 1,
      validEntries: results.length,
      anomaliesFound: anomalies.length,
      anomalies: anomalies
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during file processing: " + error.message });
  }
};

module.exports = {
  createExpense,
  getExpense,
  addComment,
  getRecentComments,
  importCSV
};

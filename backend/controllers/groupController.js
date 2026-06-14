const prisma = require("../config/prisma");

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id; // From authMiddleware

  if (!name) {
    return res.status(400).json({ error: "Group name is required" });
  }

  try {
    const group = await prisma.group.create({
      data: {
        name,
        members: {
          create: {
            user_id: userId,
            role: "creator",
          },
        },
      },
      include: {
        members: true,
      },
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: "Error creating group" });
  }
};

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
  const userId = req.user.id;

  try {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            user_id: userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { username: true, email: true },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: "Error fetching groups" });
  }
};

// @desc    Add a member to a group
// @route   POST /api/groups/:id/members
// @access  Private
const addGroupMember = async (req, res) => {
  const { id: groupId } = req.params;
  const { email, username } = req.body;
  const userId = req.user.id;

  try {
    // Check if requester is the creator
    const requesterMember = await prisma.groupMember.findUnique({
      where: { user_id_group_id: { user_id: userId, group_id: groupId } },
    });

    if (!requesterMember || requesterMember.role !== "creator") {
      return res.status(403).json({ error: "Only the group creator can add members" });
    }

    // Find user to add
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Add user to group
    const newMember = await prisma.groupMember.create({
      data: {
        group_id: groupId,
        user_id: targetUser.id,
        role: "member",
      },
    });

    res.status(201).json({ message: "Member added", member: newMember });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "User is already in the group" });
    }
    res.status(500).json({ error: "Error adding member" });
  }
};

// @desc    Remove a member from a group
// @route   DELETE /api/groups/:id/members
// @access  Private
const removeGroupMember = async (req, res) => {
  const { id: groupId } = req.params;
  const { targetUserId } = req.body;
  const userId = req.user.id;

  try {
    const requesterMember = await prisma.groupMember.findUnique({
      where: { user_id_group_id: { user_id: userId, group_id: groupId } },
    });

    if (!requesterMember) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    // Allow removal if requester is creator, OR if the requester is leaving themselves
    if (requesterMember.role !== "creator" && targetUserId !== userId) {
      return res.status(403).json({ error: "Only the group creator can remove other members" });
    }

    // Check if member has pending balance (assuming a function exists or querying ExpenseSplit)
    // For MVP, we prevent deleting if they owe or are owed money in this group
    const balances = await prisma.expenseSplit.aggregate({
      where: { 
        user_id: targetUserId,
        expense: { group_id: groupId }
      },
      _sum: { amount_owed: true }
    });

    // Need to factor in settlements as well. For now, simple check.
    // If they have any active expense splits, prevent deletion.
    const splitCount = await prisma.expenseSplit.count({
      where: {
        user_id: targetUserId,
        expense: { group_id: groupId }
      }
    });

    if (splitCount > 0) {
      return res.status(400).json({ error: "Cannot remove member with active expenses in the group" });
    }

    await prisma.groupMember.delete({
      where: { user_id_group_id: { user_id: targetUserId, group_id: groupId } },
    });

    res.status(200).json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ error: "Error removing member" });
  }
};

const computeBalances = async (groupId) => {
  // Fetch all expenses with splits
  const expenses = await prisma.expense.findMany({
    where: { group_id: groupId },
    include: { splits: true }
  });

  // Fetch all settlements
  const settlements = await prisma.settlement.findMany({
    where: { group_id: groupId }
  });

  // debts map: { [fromUserId]: { [toUserId]: amount } }
  const debts = {};

  const ensureUser = (u) => {
    if (!debts[u]) debts[u] = {};
  };

  // 1. Add up all expense splits
  expenses.forEach(exp => {
    const paidBy = exp.paid_by_user_id;
    ensureUser(paidBy);

    exp.splits.forEach(split => {
      const owedBy = split.user_id;
      if (owedBy !== paidBy) {
        ensureUser(owedBy);
        if (!debts[owedBy][paidBy]) debts[owedBy][paidBy] = 0;
        debts[owedBy][paidBy] += split.amount_owed;
      }
    });
  });

  // 2. Subtract settlements
  settlements.forEach(settle => {
    const paidBy = settle.paid_by_user_id; // the person who owed
    const paidTo = settle.paid_to_user_id; // the person who was owed
    ensureUser(paidBy);
    if (!debts[paidBy][paidTo]) debts[paidBy][paidTo] = 0;
    debts[paidBy][paidTo] -= settle.amount;
  });

  // 3. Net out mutual debts
  const userIds = Object.keys(debts);
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const userA = userIds[i];
      const userB = userIds[j];

      const aOwesB = debts[userA]?.[userB] || 0;
      const bOwesA = debts[userB]?.[userA] || 0;

      const net = aOwesB - bOwesA;

      if (net > 0) {
        // userA owes userB net
        if (debts[userA]) debts[userA][userB] = net;
        if (debts[userB]) debts[userB][userA] = 0;
      } else if (net < 0) {
        // userB owes userA abs(net)
        if (debts[userB]) debts[userB][userA] = Math.abs(net);
        if (debts[userA]) debts[userA][userB] = 0;
      } else {
        // completely settled between A and B
        if (debts[userA]) debts[userA][userB] = 0;
        if (debts[userB]) debts[userB][userA] = 0;
      }
    }
  }

  // Convert to array
  const balanceArray = [];
  userIds.forEach(fromUser => {
    const targets = debts[fromUser] || {};
    Object.keys(targets).forEach(toUser => {
      if (targets[toUser] > 0.01) { // ignore floating point zeroes
        balanceArray.push({
          fromUserId: fromUser,
          toUserId: toUser,
          amount: parseFloat(targets[toUser].toFixed(2))
        });
      }
    });
  });

  return balanceArray;
};

// @desc    Get exact balances for a group
// @route   GET /api/groups/:id/balances
// @access  Private
const getGroupBalances = async (req, res) => {
  try {
    const balances = await computeBalances(req.params.id);
    res.status(200).json(balances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error computing balances" });
  }
};

// @desc    Get all expenses for a group
// @route   GET /api/groups/:id/expenses
// @access  Private
const getGroupExpenses = async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { group_id: req.params.id },
      include: {
        paid_by: { select: { username: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    });
    res.status(200).json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching group expenses" });
  }
};

module.exports = {
  createGroup,
  getGroups,
  addGroupMember,
  removeGroupMember,
  getGroupBalances,
  getGroupExpenses,
};

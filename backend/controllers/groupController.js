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
    // Check if requester is the creator
    const requesterMember = await prisma.groupMember.findUnique({
      where: { user_id_group_id: { user_id: userId, group_id: groupId } },
    });

    if (!requesterMember || requesterMember.role !== "creator") {
      return res.status(403).json({ error: "Only the group creator can remove members" });
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

module.exports = {
  createGroup,
  getGroups,
  addGroupMember,
  removeGroupMember,
};

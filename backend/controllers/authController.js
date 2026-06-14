const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: "Please provide all fields" });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: "User with this email or username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: username
      }
    });

    res.status(201).json({ message: "User created successfully. Please login." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error during signup" });
  }
};

// Login is handled automatically by Auth.js at POST /api/auth/callback/credentials
// Logout is handled automatically by Auth.js at POST /api/auth/signout

module.exports = {
  signup,
};

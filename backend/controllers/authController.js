const supabase = require("../config/supabase");

// @desc    Register new user
// @route   POST /api/auth/signup
const signup = async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // 2. Note: A Prisma User record should also be created here in a real scenario
    // (e.g. Prisma.User.create({...})) but for now we focus on Supabase Auth

    res.status(201).json({ message: "User created successfully", user: authData.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Supabase returns a session object containing the access_token (JWT)
    res.status(200).json({ message: "Login successful", session: data.session });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  signup,
  login,
  logout,
};

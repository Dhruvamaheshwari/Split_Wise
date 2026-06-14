const supabase = require("../config/supabase");

// Middleware to protect routes by verifying the JWT token sent from the client
const protect = async (req, res, next) => {
  let token;

  // Check if authorization header exists and starts with Bearer
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized to access this route, no token provided" });
  }

  try {
    // Verify the token using Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Not authorized, token failed" });
    }

    // Attach the user to the request object so protected routes can use it
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Not authorized, token failed" });
  }
};

module.exports = { protect };

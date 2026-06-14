const { getAuthConfig } = require("../config/auth");

const protect = async (req, res, next) => {
  try {
    // getSession uses the request cookies/headers to verify the session
    const { getSession } = await import("@auth/express");
    const authConfig = await getAuthConfig();
    const session = await getSession(req, authConfig);
    
    if (!session || !session.user) {
      return res.status(401).json({ error: "Not authorized, no valid session" });
    }

    req.user = session.user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Not authorized, session failed" });
  }
};

module.exports = { protect };

require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;

// Import Routes
const authRoutes = require("./routes/authRoutes");
const { protect } = require("./middleware/authMiddleware");
const { ExpressAuth, authConfig } = require("./config/auth");
const cors = require("cors");

// Middleware
app.use(cors({ 
  origin: function(origin, callback) {
    callback(null, origin || true);
  }, 
  credentials: true 
}));
app.use(express.json());

// Set trust proxy if behind a reverse proxy
app.set('trust proxy', 1);

// Custom Auth Routes (Signup) MUST come first so Auth.js doesn't throw UnknownAction
app.use("/api/auth", authRoutes);

// Mount Auth.js for Express (handles /api/auth/callback/credentials, etc.)
app.use("/api/auth", ExpressAuth(authConfig));

const groupRoutes = require("./routes/groupRoutes");
app.use("/api/groups", groupRoutes);

const expenseRoutes = require("./routes/expenseRoutes");
app.use("/api/expenses", expenseRoutes);

const settlementRoutes = require("./routes/settlementRoutes");
app.use("/api/settlements", settlementRoutes);

// Example protected route
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "You are accessing a protected route!", user: req.user });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

module.exports = app;
const express = require("express");
const app = express();
const port = 3000;

// Import Routes
const authRoutes = require("./routes/authRoutes");
const { protect } = require("./middleware/authMiddleware");

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

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
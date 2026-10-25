
import express from "express";
import "dotenv/config";
import pool from "./config/db.js";
import usersRoutes from "../Server/module/users/user.routes.js";
import cookieParser from "cookie-parser";
import { errorHandler, notFound } from "./middleware/error_middleware.js";
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
app.use(cookieParser());
app.use("/api/users", usersRoutes);

app.use(notFound);
app.use(errorHandler);
// Basic server check
app.get("/", (req, res) => {
  res.json({
    message: "FinPilot API is running!",
    status: "success",
  });
});

// Check whether the database connection works
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS server_time"
    );

    res.status(200).json({
      status: "success",
      message: "Database connection successful",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`FinPilot server running at http://localhost:${PORT}`);
});

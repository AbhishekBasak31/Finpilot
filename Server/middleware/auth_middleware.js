
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.slice(7).trim();

    if (!token || !process.env.JWT_SECRET) {
      const error = new Error("Invalid authentication configuration or token");
      error.statusCode = token ? 500 : 401;
      throw error;
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      const authError = new Error(
        error.name === "TokenExpiredError"
          ? "Access token expired. Please log in again."
          : "Invalid access token",
      );
      authError.statusCode = 401;
      throw authError;
    }

    if (
      typeof decoded.sub !== "string" ||
      typeof decoded.sid !== "string"
    ) {
      const error = new Error("Invalid access token payload");
      error.statusCode = 401;
      throw error;
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name,
              u.status, u.email_verified, s.id AS session_id
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1
         AND s.user_id = $2
         AND s.expires_at > NOW()`,
      [decoded.sid, decoded.sub],
    );

    const user = result.rows[0];

    if (!user) {
      const error = new Error("Session expired or revoked. Please log in again.");
      error.statusCode = 401;
      throw error;
    }

    if (user.status !== "ACTIVE") {
      const error = new Error("Account is not active");
      error.statusCode = 403;
      throw error;
    }

    if (!user.email_verified) {
      const error = new Error("Please verify your email");
      error.statusCode = 403;
      throw error;
    }

    req.user = {
      userId: user.id,
      sessionId: user.session_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

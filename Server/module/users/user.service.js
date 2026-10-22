import bcrypt from "bcrypt";
import pool from "../../config/db.js";

export async function registerUser({
  firstName,
  lastName,
  email,
  password,
}) {
  const normalizedEmail = email.trim().toLowerCase();

  // Check whether the email is already registered
  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail]
  );

  if (existingUser.rowCount > 0) {
    const error = new Error("Email is already registered");
    error.statusCode = 409;
    throw error;
  }

  // Never store the original password
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users
      (email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, first_name, last_name, status, created_at`,
    [
      normalizedEmail,
      passwordHash,
      firstName.trim(),
      lastName?.trim() || null,
    ]
  );

  return result.rows[0];
}
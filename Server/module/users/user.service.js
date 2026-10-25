
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  createHmac,
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import pool from "../../config/db.js";
import { sendVerificationEmail } from "../../services/mail.service.js";

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_RESEND_MAX_AGE_MINUTES = 30;

const REFRESH_TOKEN_DAYS = Number(
  process.env.REFRESH_TOKEN_DAYS || 7
);

function createRefreshToken() {
  return randomBytes(64).toString("base64url");
}

function hashRefreshToken(token) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function createAccessToken(userId, sessionId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      sub: userId,
      sid: sessionId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      issuer: "finpilot-api",
      audience: "finpilot-client",
    },
  );
}

function createOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashOtp(userId, otp) {
  if (!process.env.OTP_SECRET) {
    throw new Error("OTP_SECRET is not configured");
  }

  return createHmac("sha256", process.env.OTP_SECRET)
    .update(`${userId}:${otp}`)
    .digest("hex");
}

function safeCompareHex(a, b) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}

function safeUser(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    emailVerified: row.email_verified,
    status: row.status,
  };
}

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function issueOtp(client, user) {
  const otp = createOtp();
  const otpHash = hashOtp(user.id, otp);

  await client.query(
    `INSERT INTO email_verification_otps
       (user_id, otp_hash, expires_at, attempts, last_sent_at, created_at)
     VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       otp_hash = EXCLUDED.otp_hash,
       expires_at = EXCLUDED.expires_at,
       attempts = 0,
       last_sent_at = NOW(),
       created_at = NOW()`,
    [user.id, otpHash],
  );

  return otp;
}

export async function registerUser({
  firstName,
  lastName,
  email,
  password,
}) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, 12);

  const client = await pool.connect();
  let user;
  let otp;

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, email_verified, status`,
      [
        normalizedEmail,
        passwordHash,
        firstName.trim(),
        lastName?.trim() || null,
      ],
    );

    user = result.rows[0];
    otp = await issueOtp(client, user);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw createError("Email is already registered", 409);
    }

    throw error;
  } finally {
    client.release();
  }

  // Email delivery happens after the database transaction commits.
  // If SMTP fails, the account remains pending and can request a new OTP.
  try {
    await sendVerificationEmail({
      email: user.email,
      firstName: user.first_name,
      otp,
    });
  } catch (error) {
    console.error("[verification email]", error.message);
    throw createError(
      "Account created, but the verification email could not be sent. Please request a new code.",
      503,
    );
  }

  return {
    user: safeUser(user),
    message: "Account created. Check your email for the verification code.",
  };
}

export async function verifyEmail({ email, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const result = await client.query(
      `SELECT u.id, u.email_verified, o.otp_hash, o.expires_at, o.attempts
       FROM users u
       JOIN email_verification_otps o ON o.user_id = u.id
       WHERE u.email = $1
       FOR UPDATE OF u, o`,
      [normalizedEmail],
    );

    const record = result.rows[0];

    if (!record) {
      throw createError("Invalid or expired verification code", 400);
    }

    if (record.email_verified) {
      await client.query(
        "DELETE FROM email_verification_otps WHERE user_id = $1",
        [record.id],
      );
      await client.query("COMMIT");
      transactionOpen = false;
      return { message: "Email is already verified" };
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw createError("Too many attempts. Request a new verification code.", 429);
    }

    if (new Date(record.expires_at) <= new Date()) {
      throw createError("Verification code has expired. Request a new one.", 400);
    }

    const suppliedHash = hashOtp(record.id, otp);

    if (!safeCompareHex(record.otp_hash, suppliedHash)) {
      await client.query(
        `UPDATE email_verification_otps
         SET attempts = attempts + 1
         WHERE user_id = $1`,
        [record.id],
      );

      await client.query("COMMIT");
      transactionOpen = false;
      throw createError("Invalid or expired verification code", 400);
    }

    await client.query(
      `UPDATE users
       SET email_verified = TRUE, updated_at = NOW()
       WHERE id = $1`,
      [record.id],
    );

    await client.query(
      "DELETE FROM email_verification_otps WHERE user_id = $1",
      [record.id],
    );

    await client.query("COMMIT");
    transactionOpen = false;

    return { message: "Email verified successfully. You can now log in." };
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => {});
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function resendVerificationOtp({ email }) {
  const normalizedEmail = normalizeEmail(email);
  const client = await pool.connect();
  let user;
  let otp;

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, email, first_name, email_verified
       FROM users
       WHERE email = $1
       FOR UPDATE`,
      [normalizedEmail],
    );

    user = result.rows[0];

    // Use a generic response so this endpoint does not disclose accounts.
    if (!user || user.email_verified) {
      await client.query("COMMIT");
      return {
        message: "If the account needs verification, a code will be sent.",
      };
    }

    const existing = await client.query(
      `SELECT last_sent_at FROM email_verification_otps
       WHERE user_id = $1 FOR UPDATE`,
      [user.id],
    );

    if (existing.rowCount > 0) {
      const ageSeconds =
        (Date.now() - new Date(existing.rows[0].last_sent_at).getTime()) / 1000;

      if (ageSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        throw createError(
          `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - ageSeconds)} seconds before requesting another code.`,
          429,
        );
      }
    }

    otp = await issueOtp(client, user);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  try {
    await sendVerificationEmail({
      email: user.email,
      firstName: user.first_name,
      otp,
    });
  } catch (error) {
    console.error("[resend verification email]", error.message);
    throw createError("Could not send the verification email. Please try again later.", 503);
  }

  return {
    message: "If the account needs verification, a code will be sent.",
  };
}


export async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const result = await pool.query(
    `SELECT id, email, password_hash, first_name, last_name,
            email_verified, status
     FROM users
     WHERE email = $1`,
    [normalizedEmail],
  );

  const user = result.rows[0];

  const passwordMatches = user
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!user || !passwordMatches) {
    throw createError("Invalid email or password", 401);
  }

  if (user.status !== "ACTIVE") {
    throw createError("This account is not active", 403);
  }

  if (!user.email_verified) {
    throw createError(
      "Please verify your email before logging in",
      403,
    );
  }

  const sessionId = randomUUID();
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const accessToken = createAccessToken(user.id, sessionId);

  const sessionResult = await pool.query(
    `INSERT INTO user_sessions
       (id, user_id, refresh_token_hash, expires_at)
     VALUES (
       $1, $2, $3,
       NOW() + ($4 * INTERVAL '1 day')
     )
     RETURNING expires_at`,
    [
      sessionId,
      user.id,
      refreshTokenHash,
      REFRESH_TOKEN_DAYS,
    ],
  );

  return {
    user: safeUser(user),
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresAt: sessionResult.rows[0].expires_at,
  };
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw createError("Refresh token is missing", 401);
  }

  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const result = await client.query(
      `SELECT
         s.id AS session_id,
         s.user_id,
         u.email,
         u.first_name,
         u.last_name,
         u.email_verified,
         u.status
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1
         AND s.expires_at > NOW()
       FOR UPDATE OF s, u`,
      [hashRefreshToken(refreshToken)],
    );

    const session = result.rows[0];

    if (!session) {
      throw createError(
        "Refresh token is invalid, expired, or revoked",
        401,
      );
    }

    if (
      session.status !== "ACTIVE" ||
      !session.email_verified
    ) {
      await client.query(
        `DELETE FROM user_sessions
         WHERE id = $1`,
        [session.session_id],
      );

      await client.query("COMMIT");
      transactionOpen = false;

      throw createError(
        "Account is not eligible for authentication",
        403,
      );
    }

    const nextRefreshToken = createRefreshToken();
    const nextRefreshHash = hashRefreshToken(nextRefreshToken);

    const updated = await client.query(
      `UPDATE user_sessions
       SET refresh_token_hash = $1,
           expires_at = NOW() + ($2 * INTERVAL '1 day')
       WHERE id = $3
       RETURNING expires_at`,
      [
        nextRefreshHash,
        REFRESH_TOKEN_DAYS,
        session.session_id,
      ],
    );

    const accessToken = createAccessToken(
      session.user_id,
      session.session_id,
    );

    await client.query("COMMIT");
    transactionOpen = false;

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      expiresAt: updated.rows[0].expires_at,
    };
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => {});
    }

    throw error;
  } finally {
    client.release();
  }
}


export async function logoutUser(refreshToken) {
  if (refreshToken) {
    await pool.query(
      `DELETE FROM user_sessions
       WHERE refresh_token_hash = $1`,
      [hashRefreshToken(refreshToken)],
    );
  }

  return {
    message: "Logged out successfully",
  };
}


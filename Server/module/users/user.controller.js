
import {
  registerUser,
  verifyEmail,
  resendVerificationOtp,
  loginUser,
  refreshSession,
  logoutUser,
} from "./user.service.js";

import { sendSuccess } from "../../utils/apiResponse.js";



export async function register(req, res) {
  const { firstName, lastName, email, password } = req.body ?? {};

  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    const error = new Error(
      "Provide a valid first name and email, and a password of 8–72 UTF-8 bytes.",
    );
    error.statusCode = 400;
    throw error;
  }

  const data = await registerUser({
    firstName,
    lastName,
    email,
    password,
  });

  return sendSuccess(res, data.user, data.message, 201);
}

export async function verifyEmailController(req, res) {
  const { email, otp } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp)
  ) {
    const error = new Error("A valid email and 6-digit OTP are required");
    error.statusCode = 400;
    throw error;
  }

  const data = await verifyEmail({ email, otp });
  return sendSuccess(res, null, data.message);
}

export async function resendOtpController(req, res) {
  const { email } = req.body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    const error = new Error("A valid email is required");
    error.statusCode = 400;
    throw error;
  }

  const data = await resendVerificationOtp({ email });
  return sendSuccess(res, null, data.message);
}
const REFRESH_COOKIE = "finpilot_refresh";

const REFRESH_COOKIE_MAX_AGE =
  Number(process.env.REFRESH_TOKEN_DAYS || 7) *
  24 * 60 * 60 * 1000;

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/users",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/users",
  });
}

export async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const data = await loginUser({ email, password });

  setRefreshCookie(res, data.refreshToken);

  // Never send the refresh token in the JSON response.
  const { refreshToken, ...responseData } = data;

  return sendSuccess(
    res,
    responseData,
    "Login successful",
  );
}

export async function refresh(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!refreshToken) {
    const error = new Error("Refresh token is missing");
    error.statusCode = 401;
    throw error;
  }

  const data = await refreshSession(refreshToken);

  // Replace the old cookie with the newly rotated token.
  setRefreshCookie(res, data.refreshToken);

  return sendSuccess(
    res,
    {
      accessToken: data.accessToken,
      tokenType: "Bearer",
      expiresAt: data.expiresAt,
    },
    "Token refreshed successfully",
  );
}

export async function logout(req, res) {
  await logoutUser(req.cookies?.[REFRESH_COOKIE]);

  clearRefreshCookie(res);

  return sendSuccess(
    res,
    null,
    "Logged out successfully",
  );
}
export async function getMe(req, res) {
  return sendSuccess(res, { user: req.user }, "User fetched successfully");
}

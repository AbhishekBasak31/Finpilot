
import {
  registerUser,
  verifyEmail,
  resendVerificationOtp,
  loginUser,
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
  return sendSuccess(res, data, "Login successful");
}

export async function logout(req, res) {
  const data = await logoutUser({
    sessionId: req.user.sessionId,
    userId: req.user.userId,
  });

  return sendSuccess(res, null, data.message);
}

export async function getMe(req, res) {
  return sendSuccess(res, { user: req.user }, "User fetched successfully");
}

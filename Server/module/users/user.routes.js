
import { Router } from "express";

import {
  register,
  verifyEmailController,
  resendOtpController,
  login,
  refresh,
  logout,
  getMe,
} from "./user.controller.js";

import { authenticate } from "../../middleware/auth_middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/verify-email", asyncHandler(verifyEmailController));
router.post("/resend-verification", asyncHandler(resendOtpController));

router.post("/login", asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));

router.get("/me", authenticate, asyncHandler(getMe));

export default router;

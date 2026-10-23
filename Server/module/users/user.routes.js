
import { Router } from "express";
import {
  register,
  verifyEmailController,
  resendOtpController,
  login,
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

router.get("/me", authenticate, asyncHandler(getMe));
router.post("/logout", authenticate, asyncHandler(logout));

export default router;

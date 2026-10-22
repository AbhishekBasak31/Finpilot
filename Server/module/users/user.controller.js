import { registerUser } from "./user.service.js";

export async function register(req, res) {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Basic input validation
    if (
      typeof firstName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !firstName.trim() ||
      !email.trim() ||
      password.length < 8 ||
      password.length > 72 ||
      (lastName != null && typeof lastName !== "string")
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Provide a first name, valid email field, and password of 8–72 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid email address.",
      });
    }

    const user = await registerUser({
      firstName,
      lastName,
      email,
      password,
    });

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: { user },
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        status: "error",
        message: error.message,
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to register user",
    });
  }
}
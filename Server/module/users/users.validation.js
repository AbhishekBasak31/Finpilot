
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration({
  firstName,
  lastName,
  email,
  password,
} = {}) {
  // 1. Validate first name
  if (typeof firstName !== "string" || !firstName.trim()) {
    return "First name is required";
  }

  if (firstName.trim().length > 100) {
    return "First name must not exceed 100 characters";
  }

  // 2. Validate last name (optional)
  if (
    lastName !== undefined &&
    lastName !== null &&
    (typeof lastName !== "string" || lastName.trim().length > 100)
  ) {
    return "Last name must be a string of at most 100 characters";
  }

  // 3. Validate email
  if (
    typeof email !== "string" ||
    !EMAIL_REGEX.test(email.trim())
  ) {
    return "A valid email address is required";
  }

  if (email.trim().length > 255) {
    return "Email must not exceed 255 characters";
  }

  // 4. Validate password
  if (typeof password !== "string") {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must contain at least 8 characters";
  }

  // bcrypt has a 72-byte password limit
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Password must not exceed 72 UTF-8 bytes";
  }

  // All validations passed
  return null;
};


export function validLogin({
  email,
  password,
}={}){
      if (
    typeof email !== "string" ||
    !EMAIL_REGEX.test(email.trim())
  ) {
    return "A valid email address is required";
  }
if (email.trim().length > 255) {
  return "Email must not exceed 255 characters";
}
   // 4. Validate password
  if (typeof password !== "string"|| !password.trim()) {
    return "Password is required";
  }

    return null;
};



export function validEmailVerify({
  email,
  otp
}={}){
      if (
    typeof email !== "string" ||
    !EMAIL_REGEX.test(email.trim())
  ) {
    return "A valid email address is required";
  }

if (email.trim().length > 255) {
  return "Email must not exceed 255 characters";
}

  if (
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp.trim())
  ) {
    return "A valid otp is required";
  }

    return null;
};



export function validResendOtp({
  email
}={}){
      if (
    typeof email !== "string" ||
    !EMAIL_REGEX.test(email.trim())
  ) {
    return "A valid email address is required";
  }
  if (email.trim().length > 255) {
  return "Email must not exceed 255 characters";
}

    return null;
};
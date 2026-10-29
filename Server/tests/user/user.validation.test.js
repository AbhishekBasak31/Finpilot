
import { describe, test, expect } from "@jest/globals";
import { validateRegistration,validLogin,validEmailVerify,validResendOtp  } from "../../module/users/users.validation";

describe("validateRegistration", () => {
  test("should return null for valid registration data", () => {
    const user = {
      firstName: "Abhishek",
      lastName: "Basak",
      email: "abhishek@example.com",
      password: "SecurePass123",
    };

    const result = validateRegistration(user);

    expect(result).toBeNull();
  });

  test("should return an error when first name is missing", () => {
    const user = {
      email: "abhishek@example.com",
      password: "SecurePass123",
    };

    const result = validateRegistration(user);

    expect(result).toBe("First name is required");
  });

  test("should return an error for an invalid email", () => {
    const user = {
      firstName: "Abhishek",
      email: "invalid-email",
      password: "SecurePass123",
    };

    const result = validateRegistration(user);

    expect(result).toBe("A valid email address is required");
  });

  test("should return an error for a short password", () => {
    const user = {
      firstName: "Abhishek",
      email: "abhishek@example.com",
      password: "abc123",
    };

    const result = validateRegistration(user);

    expect(result).toBe("Password must contain at least 8 characters");
 
  });
  test("should return an error when password is missing", () => {
  const user = {
    firstName: "Abhishek",
    email: "abhishek@example.com"
  };

  const result = validateRegistration(user);

  expect(result).toBe("Password is required");
});
});



describe("validLogin",()=>{
    test("should return null for a valid login credential",()=>{
        const user={
            email:"securepass123@gmail.com",
            password:"SecurePass123"
        }
        const result = validLogin(user);
        expect(result).toBeNull();
    });
test("should reject an email longer than 255 characters", () => {
  const user = {
    email: `${"a".repeat(250)}@example.com`,
    password: "SecurePass123"
  };

  const result = validLogin(user);

  expect(result).toBe("Email must not exceed 255 characters");
});
    test("should return an error for an invalid email",()=>{
        const user={
            email:"Invalid-email",
            password:"SecurePass123"
        }
        const result = validLogin(user);
        expect(result).toBe("A valid email address is required");
    });

test("should return an error for a whitespace-only password", () => {
        const user={
            email:"securepass123@gmail.com",
            password:" "
        }
        const result = validLogin(user);
        expect(result).toBe("Password is required");
    });
});


describe("validEmailVerify",()=>{
    test("should return null for a valid email verify",()=>{
        const data ={
            email:"securepass123@gmail.com",
            otp:"654762"
        }
        const result = validEmailVerify(data);
        expect(result).toBeNull();
    });
     test("should return an error for an invalid email id",()=>{
        const data={
            email:"Invalid-email",
            otp:"907123"
        }
        const result = validEmailVerify(data);
        expect(result).toBe("A valid email address is required");
    });
    test("should return an error for a short otp",()=>{
        const data={
            email:"securepass123@gmail.com",
            otp:"9071"
        }
        const result = validEmailVerify(data);
        expect(result).toBe("A valid otp is required");
    });
test("should reject an OTP longer than six digits", () => {
  const data = {
    email: "securepass123@gmail.com",
    otp: "1234567"
  };

  const result = validEmailVerify(data);

  expect(result).toBe("A valid otp is required");
});
    test("should reject an otp that contains letters",()=>{
        const data={
            email:"securepass123@gmail.com",
            otp:"9071ab"
        }
        const result = validEmailVerify(data);
        expect(result).toBe("A valid otp is required");
    })
});

describe("validResendOtp",()=>{

    test("should return null for a valid resend otp ",()=>{
        const data={
             email:"securepass123@gmail.com"
        }
        const result = validResendOtp(data);
        expect(result).toBeNull();
    });
      test("should return an error for an invalid email id",()=>{
        const data={
            email:"Invalid-email",
        }
        const result = validResendOtp(data);
        expect(result).toBe("A valid email address is required");
    });
});
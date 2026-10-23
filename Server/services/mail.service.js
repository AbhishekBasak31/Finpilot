
import nodemailer from "nodemailer";
import { emailVerificationTemplate } from "../mailtemplates/emailVerification.template.js";

const port = Number(process.env.SMTP_PORT || 465);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail({ email, firstName, otp }) {
  const template = emailVerificationTemplate({ firstName, otp });

  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function verifyMailConnection() {
  return transporter.verify();
}

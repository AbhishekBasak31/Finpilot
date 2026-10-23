
export function emailVerificationTemplate({ firstName, otp }) {
  const name = escapeHtml(firstName || "there");

  return {
    subject: "Verify your FinPilot email address",
    text: [
      `Hi ${firstName || "there"},`,
      "",
      `Your FinPilot verification code is ${otp}.`,
      "This code expires in 10 minutes.",
      "If you did not create this account, you can ignore this email.",
      "",
      "The FinPilot Team",
    ].join("\n"),
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">
          <div style="max-width:560px;margin:36px auto;padding:28px;background:#fff;border-radius:16px;">
            <p style="font-size:13px;font-weight:bold;letter-spacing:2px;color:#2563eb;">
              FINPILOT
            </p>
            <h1 style="font-size:24px;">Verify your email</h1>
            <p>Hi ${name},</p>
            <p>Use the code below to verify your FinPilot account.</p>
            <div style="margin:28px 0;padding:20px;text-align:center;background:#eff6ff;border-radius:12px;">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;">
                ${otp}
              </span>
            </div>
            <p>This code expires in <strong>10 minutes</strong>.</p>
            <p style="font-size:13px;color:#64748b;">
              If you did not create this account, you can ignore this email.
            </p>
            <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="font-size:12px;color:#64748b;">FinPilot · Your Personal Financial Operating System</p>
          </div>
        </body>
      </html>
    `,
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

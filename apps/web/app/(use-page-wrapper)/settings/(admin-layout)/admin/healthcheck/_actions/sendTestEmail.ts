"use server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { serverConfig } from "@calcom/lib/serverConfig";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { createTransport } from "nodemailer";

type SendTestEmailResult = {
  success: boolean;
  error?: string;
};

export async function sendTestEmail(recipientEmail: string): Promise<SendTestEmailResult> {
  // Verify admin role
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userRole = session?.user?.role;

  if (userRole !== UserPermissionRole.ADMIN) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if email is configured
  if (!serverConfig.from) {
    return { success: false, error: "EMAIL_FROM is not configured" };
  }

  // Check if SMTP transport is configured (not sendmail)
  const transport = serverConfig.transport;
  if (typeof transport === "object" && "sendmail" in transport) {
    return { success: false, error: "SMTP is not configured. Using sendmail fallback." };
  }

  try {
    const transporter = createTransport(transport);

    await transporter.sendMail({
      from: serverConfig.from,
      to: recipientEmail,
      subject: "Cal.com Test Email - SMTP Configuration Verified",
      text: `This is a test email from your Cal.com instance.

If you received this email, your SMTP configuration is working correctly.

Sent from: ${serverConfig.from}
Timestamp: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #292929;">Cal.com Test Email</h2>
          <p>This is a test email from your Cal.com instance.</p>
          <p style="color: #22c55e; font-weight: bold;">If you received this email, your SMTP configuration is working correctly.</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p style="color: #737373; font-size: 12px;">
            Sent from: ${serverConfig.from}<br />
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    let errorMessage = "Failed to send test email";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

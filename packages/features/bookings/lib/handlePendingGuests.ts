import { randomBytes } from "node:crypto";
import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import GuestVerificationEmailTemplate from "@calcom/emails/templates/guest-verification-email";
import { getTranslation } from "@calcom/i18n/server";

export async function createPendingGuestsAndSendEmails({
  guestsToVerify,
  booking,
  bookerUrl,
  language = "en",
  timeZone,
}: {
  guestsToVerify: string[];
  booking: { id: number; uid: string; title: string; startTime: Date };
  bookerUrl: string;
  language?: string;
  timeZone: string;
}): Promise<void> {
  const t = await getTranslation(language, "common");

  const bookingDateFormatted = dayjs(booking.startTime)
    .tz(timeZone)
    .format("MMMM D, YYYY [at] h:mm A");

  for (const guestEmail of guestsToVerify) {
    const token = generateToken();
    const expiresAt = dayjs().add(48, "hours").toDate();

    await prisma.pendingGuest.upsert({
      where: {
        email_bookingId: {
          email: guestEmail,
          bookingId: booking.id,
        },
      },
      update: {
        token,
        expiresAt,
        verified: false,
      },
      create: {
        email: guestEmail,
        bookingId: booking.id,
        token,
        expiresAt,
      },
    });

    const verificationLink = `${bookerUrl}/api/guest-verification/confirm?token=${token}&email=${encodeURIComponent(guestEmail)}`;

    const emailTemplate = new GuestVerificationEmailTemplate({
      language: t,
      from: process.env.EMAIL_FROM || "notifications@cal.com",
      to: guestEmail,
      guestEmail,
      bookingTitle: booking.title,
      bookingDate: bookingDateFormatted,
      verificationLink,
    });

    await emailTemplate.sendEmail();
  }
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

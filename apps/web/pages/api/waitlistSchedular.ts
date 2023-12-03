import { env } from "~/src/env.mjs";
import type { User } from "~/src/types/user";
import sendEmail from "~/src/utils/sendEmail";

export async function sendWaitlistNotificationEmail({
  user,
  subject,
  to,
  eventTypeSlug,
  availableSlot,
}: {
  user: User;
  subject: string;
  to: string;
  eventTypeSlug: string;
  availableSlot: string; // ISO format datetime
}) {
  const bookingUrl = `${env.FRONTEND_URL}/${user.username}/${eventTypeSlug}?slot=${availableSlot}`;

  const message = `Hello,\n\nA new slot has become available for ${user.name}'s event. You can book this slot at: ${bookingUrl}\n\nBest regards,\n${user.name}'s Booking Assistant`;

  await sendEmail({
    subject,
    to,
    cc: user.email,
    from: user.email, // or a designated email
    text: message,
    html: message.replace(/\n/g, "<br>"),
  });

  return "Notification sent";
}

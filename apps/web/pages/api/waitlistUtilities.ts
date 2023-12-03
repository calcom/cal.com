import { PrismaClient } from "@prisma/client";

import { sendWaitlistNotificationEmail } from "./sendBookingEmail";

const prisma = new PrismaClient();

export async function notifyNextInLine(eventTypeId: number, availableSlot: string) {
  // Retrieve the first user in the waitlist for the event type
  const waitlistEntry = await prisma.waitlist.findFirst({
    where: { eventTypeId },
    orderBy: { createdAt: "asc" },
  });

  if (waitlistEntry) {
    // Note: Ensure that the user data you need is included in the waitlistEntry
    // You may need to adjust your Prisma query to include the user's details

    // Send email notification
    await sendWaitlistNotificationEmail({
      user: waitlistEntry.user, // Assuming this contains necessary user details
      subject: "Available Slot Notification",
      to: waitlistEntry.userEmail,
      eventTypeSlug: "your-event-type-slug", // replace with actual slug
      availableSlot,
    });

    // Remove the user from the waitlist after sending the email
    await prisma.waitlist.delete({
      where: { id: waitlistEntry.id },
    });
  }
}

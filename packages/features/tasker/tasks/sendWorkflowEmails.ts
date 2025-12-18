import { z } from "zod";

import { sendCustomWorkflowEmail } from "@calcom/emails/workflow-email-service";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import { EmailWorkflowService } from "@calcom/features/ee/workflows/lib/service/EmailWorkflowService";
import { WorkflowReminderRepository } from "@calcom/features/ee/workflows/repositories/WorkflowReminderRepository";
import { prisma } from "@calcom/prisma";

export const ZSendWorkflowEmailsSchemaEager = z.object({
  to: z.array(z.string()),
  subject: z.string(),
  html: z.string(),
  replyTo: z.string().optional(),
  sender: z.string().nullable().optional(),
  attachments: z
    .array(
      z
        .object({
          content: z.string(),
          filename: z.string(),
        })
        .passthrough()
    )
    .optional(),
});

const ZSendWorkflowEmailsSchemaLazy = z.object({
  bookingUid: z.string(),
  workflowReminderId: z.number(),
});

export const ZSendWorkflowEmailsSchema = z.union([
  ZSendWorkflowEmailsSchemaEager,
  ZSendWorkflowEmailsSchemaLazy,
]);

export async function sendWorkflowEmails(payload: string): Promise<void> {
  const mailData = ZSendWorkflowEmailsSchema.parse(JSON.parse(payload));

  // Generate workflow body to send
  if ("bookingUid" in mailData && "workflowReminderId" in mailData) {
    const bookingRepository = new BookingRepository(prisma);
    const booking = await bookingRepository.getBookingForCalEventBuilderFromUid(mailData.bookingUid);

    if (!booking) {
      throw new Error("Booking not found");
    }

    const calendarEvent = (await CalendarEventBuilder.fromBooking(booking, {})).build();

    if (!calendarEvent) {
      throw new Error("Calendar event could not be built");
    }
    const workflowReminderRepository = new WorkflowReminderRepository(prisma);
    const bookingSeatRepository = new BookingSeatRepository(prisma);
    const emailWorkflowService = new EmailWorkflowService(workflowReminderRepository, bookingSeatRepository);

    await emailWorkflowService.handleSendEmailWorkflowTask({
      evt: calendarEvent,
      workflowReminderId: mailData.workflowReminderId,
    });

    return;
  }

  await Promise.all(
    mailData.to.map((to) =>
      sendCustomWorkflowEmail({
        ...mailData,
        to,
      })
    )
  );
}

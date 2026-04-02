import { schemaTask } from "@trigger.dev/sdk";
import { bookingNotificationsTaskConfig } from "./config";
import { bookingNotificationTaskSchema } from "./schema";

export const request = schemaTask({
  id: "booking.send.request.notifications",
  schema: bookingNotificationTaskSchema,
  ...bookingNotificationsTaskConfig,
  run: async (payload) => {
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { BookingEmailSmsHandler } = await import("@calcom/features/bookings/lib/BookingEmailSmsHandler");
    const { BookingRepository } = await import("@calcom/features/bookings/repositories/BookingRepository");
    const { prisma } = await import("@calcom/prisma");
    const { BookingEmailAndSmsTaskService } = await import("../../BookingEmailAndSmsTaskService");

    const triggerDevLogger = new TriggerDevLogger();
    const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: triggerDevLogger });
    const bookingRepo = new BookingRepository(prisma);
    const bookingTaskService = new BookingEmailAndSmsTaskService({
      logger: triggerDevLogger,
      bookingRepository: bookingRepo,
      emailsAndSmsHandler: emailsAndSmsHandler,
    });
    await bookingTaskService.request(payload);
  },
});

import { schemaTask } from "@trigger.dev/sdk";

import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { TriggerDevLogger } from "@calcom/lib/triggerDevLogger";
import { prisma } from "@calcom/prisma";

import { BookingEmailAndSmsTaskService } from "../../BookingEmailAndSmsTaskService";
import { bookingNotificationsTaskConfig } from "./config";
import { bookingNotificationTaskSchema, BookingNotificationPayload } from "./schema";

export const request = schemaTask({
  id: "booking.send.request.notifications",
  schema: bookingNotificationTaskSchema,
  ...bookingNotificationsTaskConfig,
  run: async (payload: BookingNotificationPayload) => {
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

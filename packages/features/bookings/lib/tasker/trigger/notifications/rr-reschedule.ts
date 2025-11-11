import { schemaTask } from "@trigger.dev/sdk";
import { taskMachineAndRetryConfig } from "bookings/lib/tasker/trigger/notifications/config";

import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { TriggerDevLogger } from "@calcom/lib/triggerDevLogger";
import { prisma } from "@calcom/prisma";

import { BookingEmailAndSmsTaskService } from "../../BookingEmailAndSmsTaskService";
import { bookingNotificationTaskSchema, BookingNotificationPayload } from "./schema";

export const rrReschedule = schemaTask({
  id: "booking.send.rr.reschedule.notifications",
  ...taskMachineAndRetryConfig,
  schema: bookingNotificationTaskSchema,
  run: async (payload: BookingNotificationPayload) => {
    const triggerDevLogger = new TriggerDevLogger();
    const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: triggerDevLogger });
    const bookingRepo = new BookingRepository(prisma);
    const bookingTaskService = new BookingEmailAndSmsTaskService({
      logger: triggerDevLogger,
      bookingRepository: bookingRepo,
      emailsAndSmsHandler: emailsAndSmsHandler,
    });
    await bookingTaskService.rrReschedule(payload);
  },
});

import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";
import { TriggerDevLogger } from "@calcom/trigger/logger";

import { BookingTaskService } from "../BookingTaskService";

export const rrReschedule = schemaTask({
  id: "booking.rr.reschedule",
  schema: z.object({
    bookingId: z.number(),
  }),
  run: async (payload: { bookingId: number }) => {
    const triggerDevLogger = new TriggerDevLogger();
    const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: triggerDevLogger });
    const bookingRepo = new BookingRepository(prisma);
    const bookingTaskService = new BookingTaskService({
      logger: triggerDevLogger,
      bookingRepository: bookingRepo,
      emailsAndSmsHandler: emailsAndSmsHandler,
    });
    await bookingTaskService.rrReschedule(payload);
  },
});

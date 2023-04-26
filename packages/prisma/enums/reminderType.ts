import type { ReminderType } from "@prisma/client";

export const reminderType: { [K in ReminderType]: K } = {
  PENDING_BOOKING_CONFIRMATION: "PENDING_BOOKING_CONFIRMATION",
};

export default reminderType;

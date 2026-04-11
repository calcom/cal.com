import { defaultBookingReminderPayload } from "./common";
import type { ZapierAction } from "../types"; // Add type safety

export const noShowAction: ZapierAction = {
  id: "booking_no_show",
  display: {
    label: "Booking No Show",
    description: "Triggers when a booking is marked as no-show",
  },
  operation: {
    perform: {
      body: {
        data: defaultBookingReminderPayload,
      },
    },
  },
};
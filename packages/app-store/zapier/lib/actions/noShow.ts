import { Trigger } from "../types";

export const noShowAction: Trigger = {
  key: "booking_no_show",
  noun: "Booking",
  display: {
    label: "Booking No-Show",
    description: "Triggers when a booking is marked as no-show.",
  },
  operation: {
    type: "hook",
    perform: {
      query: {
        triggerEvent: "BOOKING_NO_SHOW_UPDATED",
      },
    },
  },
};

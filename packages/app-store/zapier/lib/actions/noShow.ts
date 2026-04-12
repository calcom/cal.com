export const noShowAction = {
  id: "booking_no_show",
  display: {
    label: "Booking No Show",
    description: "Triggers when a booking is marked as no-show",
  },
  operation: {
    triggerEvent: "BOOKING_NO_SHOW_UPDATED",
  },
};

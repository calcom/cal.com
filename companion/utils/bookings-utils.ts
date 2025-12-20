import { BookingFilter } from "../hooks";

export const getEmptyStateContent = (activeFilter: BookingFilter) => {
  switch (activeFilter) {
    case "upcoming":
      return {
        icon: "calendar-outline" as const,
        title: "No upcoming bookings",
        text: "As soon as someone books a time with you it will show up here.",
      };
    case "unconfirmed":
      return {
        icon: "calendar-outline" as const,
        title: "No unconfirmed bookings",
        text: "Your unconfirmed bookings will show up here.",
      };
    case "past":
      return {
        icon: "calendar-outline" as const,
        title: "No past bookings",
        text: "Your past bookings will show up here.",
      };
    case "cancelled":
      return {
        icon: "calendar-outline" as const,
        title: "No cancelled bookings",
        text: "Your canceled bookings will show up here.",
      };
    default:
      return {
        icon: "calendar-outline" as const,
        title: "No bookings found",
        text: "Your bookings will appear here.",
      };
  }
};

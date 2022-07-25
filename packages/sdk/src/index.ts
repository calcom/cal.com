import { ICal } from "./types";
import "dotenv/config";

export const cal: ICal = require("api")(process.env.CAL_API_URL || "https://api.cal.com");

if (process.env.CAL_API_KEY !== undefined) cal.auth(process.env.CAL_API_KEY);
else
  console.warn("process.env.CAL_API_KEY is not defined, you can also call cal.auth(`ApiKey`) directly in your code.");

export const {
  auth,
  get,
  patch,
  post,
  // Delete is a reserved keyword, so as named export we use remove, you can still use cal.delete("path/to/resource")
  delete: remove,
  // Attenddes
  addAttendee,
  listAttendees,
  getAttendeeById,
  editAttendeeById,
  removeAttendeeById,
  // Availabilities
  addAvailability,
  listAvailabilities,
  getAvailabilityById,
  editAvailabilityById,
  removeAvailabilityById,
  // Booking References
  addBookingReference,
  listBookingReferences,
  getBookingReferenceById,
  editBookingReferenceById,
  removeBookingReferenceById,
  // Custom Inputs
  addCustomInput,
  listCustomInputs,
  getCustomInputById,
  editCustomInputById,
  removeCustomInputById,
  // Bookings
  addBooking,
  listBookings,
  getBookingById,
  editBookingById,
  removeBookingById,
  // Schedule
  addSchedule,
  listSchedules,
  getScheduleById,
  editScheduleById,
  removeScheduleById,
  // Teams
  addTeam,
  listTeams,
  getTeamById,
  editTeamById,
  removeTeamById,
  // Users
  addUser,
  listUsers,
  getUserById,
  editUserById,
  removeUserById,
  // Membership
  addMembership,
  listMemberships,
  getMembershipById,
  editMembershipById,
  removeMembershipById,
  // Payments
  listPayments,
  getPaymentById,
  // Event Types
  addEventType,
  listEventTypes,
  getEventTypeById,
  editEventTypeById,
  removeEventTypeById,
  // Destination Calendars
  addDestinationCalendar,
  listDestinationCalendars,
  getDestinationCalendarById,
  editDestinationCalendarById,
  removeDestinationCalendarById,
  // Selected Calendars
  addSelectedCalendar,
  listSelectedCalendars,
  getSelectedCalendarById,
  editSelectedCalendarById,
  removeSelectedCalendarById,
  // Event References
  addEventReference,
  listEventReferences,
  getEventReferenceById,
  editEventReferenceById,
  removeEventReferenceById
} = cal;

export default cal;

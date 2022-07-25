import {
  Attendee,
  Availability,
  Booking,
  BookingReference,
  DailyEventReference,
  DestinationCalendar,
  EventType,
  EventTypeCustomInput,
  Membership,
  Payment,
  Schedule,
  SelectedCalendar,
  Team,
  User
} from "@calcom/prisma/client";
import "dotenv/config";

export interface ICal {
  // ApiKey auth()
  auth(apiKey: string): Promise<JSON>;
  // HTTP method based operations.
  get(path: string): Promise<JSON>;
  post(path: string): Promise<JSON>;
  patch(path: string): Promise<JSON>;
  // Delete and remove do the same *call* and endpoint passed as string with DELETE method.
  delete(path: string): Promise<{ message: string }>;
  remove(path: string): Promise<{ message: string }>;

  // Attenddees
  listAttendees(): Promise<Attendee[]>;
  getAttendeeById(args: { id: number }): Promise<Attendee>;
  addAttendee(body: Partial<Attendee>): Promise<Attendee>;
  editAttendeeById(body: Partial<Attendee>, args: { id: number }): Promise<Attendee>;
  removeAttendeeById(args: { id: number }): Promise<{ message: string }>;

  // Availabilities
  listAvailabilities(): Promise<Availability[]>;
  getAvailabilityById(args: { id: number }): Promise<Availability>;
  addAvailability(args: Partial<Availability>): Promise<Availability>;
  editAvailabilityById(body: Partial<Availability>, args: { id: number }): Promise<Availability>;
  removeAvailabilityById(args: { id: number }): Promise<{ message: string }>;

  // BookingReferences
  listBookingReferences(): Promise<BookingReference[]>;
  getBookingReferenceById(args: { id: number }): Promise<BookingReference>;
  addBookingReference(args: Partial<BookingReference>): Promise<BookingReference>;
  editBookingReferenceById(body: Partial<BookingReference>, args: { id: number }): Promise<BookingReference>;
  removeBookingReferenceById(args: { id: number }): Promise<{ message: string }>;

  // Bookings
  listBookings(): Promise<Booking[]>;
  getBookingById(args: { id: number }): Promise<Booking>;
  addBooking(args: Partial<Booking>): Promise<Booking>;
  editBookingById(body: Partial<Booking>, args: { id: number }): Promise<Booking>;
  removeBookingById(args: { id: number }): Promise<{ message: string }>;

  // CustomInputs
  listCustomInputs(): Promise<EventTypeCustomInput[]>;
  getCustomInputById(args: { id: number }): Promise<EventTypeCustomInput>;
  addCustomInput(args: Partial<EventTypeCustomInput>): Promise<EventTypeCustomInput>;
  editCustomInputById(body: Partial<EventTypeCustomInput>, args: { id: number }): Promise<EventTypeCustomInput>;
  removeCustomInputById(args: { id: number }): Promise<{ message: string }>;

  // DestinationCalendars
  listDestinationCalendars(): Promise<DestinationCalendar[]>;
  getDestinationCalendarById(args: { id: number }): Promise<DestinationCalendar>;
  addDestinationCalendar(args: Partial<DestinationCalendar>): Promise<DestinationCalendar>;
  editDestinationCalendarById(body: Partial<DestinationCalendar>, args: { id: number }): Promise<DestinationCalendar>;
  removeDestinationCalendarById(args: { id: number }): Promise<{ message: string }>;

  // EventReferences
  listEventReferences(): Promise<DailyEventReference[]>;
  getEventReferenceById(args: { id: number }): Promise<DailyEventReference>;
  addEventReference(args: Partial<DailyEventReference>): Promise<DailyEventReference>;
  editEventReferenceById(body: Partial<DailyEventReference>, args: { id: number }): Promise<DailyEventReference>;
  removeEventReferenceById(args: { id: number }): Promise<{ message: string }>;

  // EventTypes
  listEventTypes(): Promise<EventType[]>;
  getEventTypeById(args: { id: number }): Promise<EventType>;
  addEventType(args: Partial<EventType>): Promise<EventType>;
  editEventTypeById(body: Partial<EventType>, args: { id: number }): Promise<EventType>;
  removeEventTypeById(args: { id: number }): Promise<{ message: string }>;

  // Memberships
  listMemberships(): Promise<Membership[]>;
  getMembershipById(args: { id: number }): Promise<Membership>;
  addMembership(args: Partial<Membership>): Promise<Membership>;
  editMembershipById(body: Partial<Membership>, args: { id: number }): Promise<Membership>;
  removeMembershipById(args: { id: number }): Promise<{ message: string }>;

  // Payments
  listPayments(): Promise<Payment[]>;
  getPaymentById(args: { id: number }): Promise<Payment>;

  // Schedules
  listSchedules(): Promise<Schedule[]>;
  getScheduleById(args: { id: number }): Promise<Schedule>;
  addSchedule(args: Partial<Schedule>): Promise<Schedule>;
  editScheduleById(body: Partial<Schedule>, args: { id: number }): Promise<Schedule>;
  removeScheduleById(args: { id: number }): Promise<{ message: string }>;

  // SelectedCalendars
  listSelectedCalendars(): Promise<SelectedCalendar[]>;
  getSelectedCalendarById(args: { id: number }): Promise<SelectedCalendar>;
  addSelectedCalendar(args: Partial<SelectedCalendar>): Promise<SelectedCalendar>;
  editSelectedCalendarById(body: Partial<SelectedCalendar>, args: { id: number }): Promise<SelectedCalendar>;
  removeSelectedCalendarById(args: { id: number }): Promise<{ message: string }>;

  // Teams
  listTeams(): Promise<Team[]>;
  getTeamById(args: { id: number }): Promise<Team>;
  addTeam(body: Partial<Team>): Promise<Team>;
  editTeamById(body: Partial<Team>, args: { id: number }): Promise<Team>;
  removeTeamById(args: { id: number }): Promise<{ message: string }>;

  // Users
  listUsers(): Promise<User[]>;
  addUser(body: Partial<User>): Promise<User>;
  getUserById(args: { id: number }): Promise<User>;
  editUserById(body: any, args: { id: number }): Promise<User>;
  removeUserById(args: { id: number }): Promise<{ message: string }>;
}

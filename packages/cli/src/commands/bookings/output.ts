import chalk from "chalk";
import {
  formatDateShort,
  formatTimeRange,
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  Booking,
  BookingActionResponse,
  BookingList,
  BookingRecordings,
  BookingReferences,
  BookingResponse,
  BookingTranscripts,
  CalendarLinks,
  CreateBookingResponse,
  RescheduleBookingResponse,
  VideoSessions,
} from "./types";

function normalizeBooking(
  data: BookingResponse | CreateBookingResponse | RescheduleBookingResponse | undefined
): Booking | undefined {
  if (!data) return undefined;
  if (Array.isArray(data)) return data[0] as Booking;
  return data as Booking;
}

function renderBookingDetail(booking: Booking): void {
  renderHeader(`Booking: ${booking.title}`);
  renderDetail([
    ["UID:", booking.uid],
    ["Status:", booking.status],
    ["Start:", new Date(booking.start).toLocaleString()],
    ["End:", new Date(booking.end).toLocaleString()],
    ["Duration:", `${booking.duration} min`],
    ["Location:", booking.location],
    ["Meeting:", booking.meetingUrl],
    ["Attendees:", booking.attendees?.length ? `${booking.attendees.length} attendee(s)` : undefined],
  ]);
}

export function renderBooking(data: BookingResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const booking = normalizeBooking(data);

  if (!booking) {
    console.log("Booking not found.");
    return;
  }

  renderBookingDetail(booking);
}

export function renderBookingList(bookings: BookingList | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(bookings, null, 2));
    return;
  }

  if (!bookings?.length) {
    console.log("No bookings found.");
    return;
  }

  renderTable(
    ["UID", "Title", "Date", "Time", "Status", "Attendees"],
    bookings.map((booking) => {
      const attendees = booking.attendees?.map((a) => a.name || a.email).join(", ") || "";
      return [
        booking.uid.substring(0, 8),
        booking.title || "",
        formatDateShort(booking.start),
        formatTimeRange(booking.start, booking.end),
        booking.status || "",
        attendees,
      ];
    })
  );
}

export function renderBookingCreated(
  data: CreateBookingResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const booking = normalizeBooking(data);

  if (!booking) {
    console.log("Failed to create booking.");
    return;
  }

  renderSuccess(`Booking created: ${booking.uid}`);
  renderBookingDetail(booking);
}

export function renderBookingRescheduled(
  data: RescheduleBookingResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const booking = normalizeBooking(data);

  if (!booking) {
    console.log("Failed to reschedule booking.");
    return;
  }

  renderSuccess(`Booking rescheduled. New UID: ${booking.uid}`);
  renderBookingDetail(booking);
}

export function renderBookingAction(
  action: string,
  bookingUid: string,
  response: BookingActionResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  renderSuccess(`Booking ${bookingUid} ${action}.`);
}

export function renderBookingRecordings(
  data: BookingRecordings | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("No recordings found for this booking.");
    return;
  }

  renderHeader(`Recordings (${data.length})`);
  renderTable(
    ["ID", "Room", "Duration", "Download Link"],
    data.map((recording) => [
      recording.id || "",
      recording.roomName || "",
      recording.duration ? `${Math.round(recording.duration / 60)}m` : "",
      recording.downloadLink || "",
    ])
  );
}

export function renderBookingTranscripts(
  data: BookingTranscripts | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("No transcripts found for this booking.");
    return;
  }

  renderHeader(`Transcripts (${data.length})`);
  data.forEach((transcript, index) => {
    console.log(`  ${index + 1}. ${transcript}`);
  });
  console.log();
}

export function renderBookingReferences(
  data: BookingReferences | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("No references found for this booking.");
    return;
  }

  renderHeader(`Booking References (${data.length})`);
  renderTable(
    ["ID", "Type", "Event UID", "Calendar ID"],
    data.map((ref) => [String(ref.id), ref.type || "", ref.eventUid || "", ref.destinationCalendarId || "-"])
  );
}

export function renderCalendarLinks(data: CalendarLinks | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("No calendar links found for this booking.");
    return;
  }

  renderHeader(`Calendar Links (${data.length})`);
  data.forEach((link) => {
    console.log(`  ${link.label}: ${link.link}`);
  });
  console.log();
}

export function renderVideoSessions(data: VideoSessions | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("No video sessions found for this booking.");
    return;
  }

  renderHeader(`Video Sessions (${data.length})`);
  renderTable(
    ["ID", "Room", "Duration", "Participants", "Ongoing"],
    data.map((session) => [
      session.id || "",
      session.room || "",
      session.duration ? `${Math.round(session.duration / 60)}m` : "",
      String(session.maxParticipants || 0),
      session.ongoing ? "Yes" : "No",
    ])
  );
}

interface BookingAttendee {
  id?: number;
  name?: string;
  email?: string;
  timeZone?: string;
  absent?: boolean;
}

export function renderBookingAttendees(
  data: BookingAttendee[] | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("No attendees found for this booking.");
    return;
  }

  renderHeader(`Attendees (${data.length})`);
  renderTable(
    ["ID", "Name", "Email", "Timezone", "Absent"],
    data.map((attendee) => [
      String(attendee.id || ""),
      attendee.name || "",
      attendee.email || "",
      attendee.timeZone || "",
      attendee.absent ? "Yes" : "No",
    ])
  );
}

export function renderBookingAttendee(data: BookingAttendee | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Attendee not found.");
    return;
  }

  renderHeader("Attendee Details");
  renderDetail([
    ["ID:", String(data.id || "")],
    ["Name:", data.name],
    ["Email:", data.email],
    ["Timezone:", data.timeZone],
    ["Absent:", data.absent ? "Yes" : "No"],
  ]);
}

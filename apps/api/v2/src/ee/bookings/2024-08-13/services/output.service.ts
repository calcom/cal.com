import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { DateTime } from "luxon";
import { z } from "zod";

import {
  BookingOutput_2024_08_13,
  CreateRecurringSeatedBookingOutput_2024_08_13,
  CreateSeatedBookingOutput_2024_08_13,
  GetRecurringSeatedBookingOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  SeatedAttendee,
} from "@calcom/platform-types";
import { Booking, BookingSeat } from "@calcom/prisma/client";

export const bookingResponsesSchema = z
  .object({
    email: z.string(),
    name: z.string(),
    guests: z.array(z.string()).optional(),
    rescheduleReason: z.string().optional(),
  })
  .passthrough();

export const seatedBookingResponsesSchema = z
  .object({
    responses: z
      .object({
        email: z.string(),
        name: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

type DatabaseBooking = Booking & {
  eventType: {
    id: number;
    slug: string;
  } | null;
  attendees: {
    name: string;
    email: string;
    timeZone: string;
    locale: string | null;
    noShow: boolean | null;
    bookingSeat?: BookingSeat | null;
  }[];
} & { user: { id: number; name: string | null; email: string } | null };

@Injectable()
export class OutputBookingsService_2024_08_13 {
  constructor(private readonly bookingsRepository: BookingsRepository_2024_08_13) {}

  getOutputBooking(databaseBooking: DatabaseBooking) {
    const dateStart = DateTime.fromISO(databaseBooking.startTime.toISOString());
    const dateEnd = DateTime.fromISO(databaseBooking.endTime.toISOString());
    const duration = dateEnd.diff(dateStart, "minutes").minutes;

    const bookingResponses = bookingResponsesSchema.parse(databaseBooking.responses);

    const booking = {
      id: databaseBooking.id,
      uid: databaseBooking.uid,
      title: databaseBooking.title,
      description: databaseBooking.description,
      hosts: [databaseBooking.user],
      status: databaseBooking.status.toLowerCase(),
      cancellationReason: databaseBooking.cancellationReason || undefined,
      reschedulingReason: bookingResponses?.rescheduledReason,
      rescheduledFromUid: databaseBooking.fromReschedule || undefined,
      start: databaseBooking.startTime,
      end: databaseBooking.endTime,
      duration,
      eventType: databaseBooking.eventType,
      // note(Lauris): eventTypeId is deprecated
      eventTypeId: databaseBooking.eventTypeId,
      attendees: databaseBooking.attendees.map((attendee) => ({
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: attendee.locale,
        absent: !!attendee.noShow,
      })),
      guests: bookingResponses.guests,
      location: databaseBooking.location,
      // note(Lauris): meetingUrl is deprecated
      meetingUrl: databaseBooking.location,
      absentHost: !!databaseBooking.noShowHost,
    };

    const bookingTransformed = plainToClass(BookingOutput_2024_08_13, booking, { strategy: "excludeAll" });
    // note(Lauris): I don't know why plainToClass erases bookings responses so attaching manually
    bookingTransformed.bookingFieldsResponses = bookingResponses;
    return bookingTransformed;
  }

  async getOutputRecurringBookings(bookingsIds: number[]) {
    const transformed = [];

    for (const bookingId of bookingsIds) {
      const databaseBooking = await this.bookingsRepository.getByIdWithAttendeesAndUserAndEvent(bookingId);
      if (!databaseBooking) {
        throw new Error(`Booking with id=${bookingId} was not found in the database`);
      }

      transformed.push(this.getOutputRecurringBooking(databaseBooking));
    }

    return transformed.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  getOutputRecurringBooking(databaseBooking: DatabaseBooking) {
    const dateStart = DateTime.fromISO(databaseBooking.startTime.toISOString());
    const dateEnd = DateTime.fromISO(databaseBooking.endTime.toISOString());
    const duration = dateEnd.diff(dateStart, "minutes").minutes;

    const bookingResponses = bookingResponsesSchema.parse(databaseBooking.responses);

    const booking = {
      id: databaseBooking.id,
      uid: databaseBooking.uid,
      title: databaseBooking.title,
      description: databaseBooking.description,
      hosts: [databaseBooking.user],
      status: databaseBooking.status.toLowerCase(),
      cancellationReason: databaseBooking.cancellationReason || undefined,
      reschedulingReason: bookingResponses?.rescheduledReason,
      rescheduledFromUid: databaseBooking.fromReschedule || undefined,
      start: databaseBooking.startTime,
      end: databaseBooking.endTime,
      duration,
      eventType: databaseBooking.eventType,
      // note(Lauris): eventTypeId is deprecated
      eventTypeId: databaseBooking.eventTypeId,
      attendees: databaseBooking.attendees.map((attendee) => ({
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: attendee.locale,
        absent: !!attendee.noShow,
      })),
      guests: bookingResponses.guests,
      location: databaseBooking.location,
      // note(Lauris): meetingUrl is deprecated
      meetingUrl: databaseBooking.location,
      recurringBookingUid: databaseBooking.recurringEventId,
      absentHost: !!databaseBooking.noShowHost,
      bookingFieldsResponses: databaseBooking.responses,
    };

    return plainToClass(RecurringBookingOutput_2024_08_13, booking, { strategy: "excludeAll" });
  }

  getOutputCreateSeatedBooking(
    databaseBooking: DatabaseBooking,
    seatUid: string
  ): CreateSeatedBookingOutput_2024_08_13 {
    const getSeatedBookingOutput = this.getOutputSeatedBooking(databaseBooking);
    return { ...getSeatedBookingOutput, seatUid };
  }

  getOutputSeatedBooking(databaseBooking: DatabaseBooking) {
    const dateStart = DateTime.fromISO(databaseBooking.startTime.toISOString());
    const dateEnd = DateTime.fromISO(databaseBooking.endTime.toISOString());
    const duration = dateEnd.diff(dateStart, "minutes").minutes;

    const booking = {
      id: databaseBooking.id,
      uid: databaseBooking.uid,
      title: databaseBooking.title,
      description: databaseBooking.description,
      hosts: [databaseBooking.user],
      status: databaseBooking.status.toLowerCase(),
      rescheduledFromUid: databaseBooking.fromReschedule || undefined,
      start: databaseBooking.startTime,
      end: databaseBooking.endTime,
      duration,
      eventType: databaseBooking.eventType,
      // note(Lauris): eventTypeId is deprecated
      eventTypeId: databaseBooking.eventTypeId,
      attendees: [],
      location: databaseBooking.location,
      // note(Lauris): meetingUrl is deprecated
      meetingUrl: databaseBooking.location,
      absentHost: !!databaseBooking.noShowHost,
    };

    const parsed = plainToClass(GetSeatedBookingOutput_2024_08_13, booking, { strategy: "excludeAll" });

    // note(Lauris): I don't know why plainToClass erases booking.attendees[n].responses so attaching manually
    parsed.attendees = databaseBooking.attendees.map((attendee) => {
      const { responses } = seatedBookingResponsesSchema.parse(attendee.bookingSeat?.data);

      const attendeeData = {
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: attendee.locale,
        absent: !!attendee.noShow,
        seatUid: attendee.bookingSeat?.referenceUid,
        bookingFieldsResponses: {},
      };
      const attendeeParsed = plainToClass(SeatedAttendee, attendeeData, { strategy: "excludeAll" });
      attendeeParsed.bookingFieldsResponses = responses || {};
      // note(Lauris): as of now email is not returned for privacy
      delete attendeeParsed.bookingFieldsResponses.email;

      return attendeeParsed;
    });

    return parsed;
  }

  async getOutputRecurringSeatedBookings(bookingsIds: number[]) {
    const transformed = [];

    for (const bookingId of bookingsIds) {
      const databaseBooking =
        await this.bookingsRepository.getByIdWithAttendeesWithBookingSeatAndUserAndEvent(bookingId);
      if (!databaseBooking) {
        throw new Error(`Booking with id=${bookingId} was not found in the database`);
      }

      transformed.push(this.getOutputRecurringSeatedBooking(databaseBooking));
    }

    return transformed.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  async getOutputCreateRecurringSeatedBookings(bookings: { uid: string; seatUid: string }[]) {
    const transformed = [];

    for (const booking of bookings) {
      const databaseBooking =
        await this.bookingsRepository.getByUidWithAttendeesWithBookingSeatAndUserAndEvent(booking.uid);
      if (!databaseBooking) {
        throw new Error(`Booking with uid=${booking.uid} was not found in the database`);
      }
      transformed.push(this.getOutputCreateRecurringSeatedBooking(databaseBooking, booking.seatUid));
    }

    return transformed.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  getOutputCreateRecurringSeatedBooking(
    databaseBooking: DatabaseBooking,
    seatUid: string
  ): CreateRecurringSeatedBookingOutput_2024_08_13 {
    const getRecurringSeatedBookingOutput = this.getOutputRecurringSeatedBooking(databaseBooking);
    return { ...getRecurringSeatedBookingOutput, seatUid };
  }

  getOutputRecurringSeatedBooking(databaseBooking: DatabaseBooking) {
    const dateStart = DateTime.fromISO(databaseBooking.startTime.toISOString());
    const dateEnd = DateTime.fromISO(databaseBooking.endTime.toISOString());
    const duration = dateEnd.diff(dateStart, "minutes").minutes;

    const booking = {
      id: databaseBooking.id,
      uid: databaseBooking.uid,
      title: databaseBooking.title,
      description: databaseBooking.description,
      hosts: [databaseBooking.user],
      status: databaseBooking.status.toLowerCase(),
      cancellationReason: databaseBooking.cancellationReason || undefined,
      rescheduledFromUid: databaseBooking.fromReschedule || undefined,
      start: databaseBooking.startTime,
      end: databaseBooking.endTime,
      duration,
      eventType: databaseBooking.eventType,
      // note(Lauris): eventTypeId is deprecated
      eventTypeId: databaseBooking.eventTypeId,
      attendees: [],
      location: databaseBooking.location,
      // note(Lauris): meetingUrl is deprecated
      meetingUrl: databaseBooking.location,
      recurringBookingUid: databaseBooking.recurringEventId,
      absentHost: !!databaseBooking.noShowHost,
    };

    const parsed = plainToClass(GetRecurringSeatedBookingOutput_2024_08_13, booking, {
      strategy: "excludeAll",
    });

    // note(Lauris): I don't know why plainToClass erases booking.attendees[n].responses so attaching manually
    parsed.attendees = databaseBooking.attendees.map((attendee) => {
      const { responses } = seatedBookingResponsesSchema.parse(attendee.bookingSeat?.data);

      const attendeeData = {
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: attendee.locale,
        absent: !!attendee.noShow,
        seatUid: attendee.bookingSeat?.referenceUid,
        bookingFieldsResponses: {},
      };
      const attendeeParsed = plainToClass(SeatedAttendee, attendeeData, { strategy: "excludeAll" });
      attendeeParsed.bookingFieldsResponses = responses || {};
      // note(Lauris): as of now email is not returned for privacy
      delete attendeeParsed.bookingFieldsResponses.email;

      return attendeeParsed;
    });

    return parsed;
  }
}

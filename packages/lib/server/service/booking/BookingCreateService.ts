import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";
import type {
  CreateBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
  CreateInstantBookingInput_2024_08_13,
} from "@calcom/platform-types";

import type { IBookingCreateService } from "./IBookingCreateService";

export class BookingCreateService implements IBookingCreateService {
  constructor() {
    // No dependencies needed for now since we're just wrapping existing functions
  }

  async createBooking(input: { bookingData: any; actor?: any; schemaGetter?: any }) {
    const { bookingData, actor, schemaGetter } = input;

    // Audit log if actor is provided
    if (actor) {
      console.log("[AUDIT] Booking created by actor:", actor);
    }

    // If schemaGetter is provided, use it (for API v1 compatibility)
    if (schemaGetter) {
      return handleNewBooking(bookingData, schemaGetter);
    }

    return handleNewBooking(bookingData);
  }

  async createRecurringBooking(input: { bookingData: CreateRecurringBookingInput_2024_08_13; actor?: any }) {
    const { bookingData, actor } = input;

    // Audit log if actor is provided
    if (actor) {
      console.log("[AUDIT] Recurring booking created by actor:", actor);
    }

    return handleNewRecurringBooking(bookingData);
  }

  async createInstantBooking(input: { bookingData: CreateInstantBookingInput_2024_08_13; actor?: any }) {
    const { bookingData, actor } = input;

    // Audit log if actor is provided
    if (actor) {
      console.log("[AUDIT] Instant booking created by actor:", actor);
    }

    return handleInstantMeeting(bookingData);
  }

  async createSeatedBooking(input: { bookingData: CreateBookingInput_2024_08_13; actor?: any }) {
    const { bookingData, actor } = input;

    // Audit log if actor is provided
    if (actor) {
      console.log("[AUDIT] Seated booking created by actor:", actor);
    }

    // Seated bookings use the same handler as regular bookings
    return handleNewBooking(bookingData);
  }

  async create(input: { bookingData: any; actor?: any; schemaGetter?: any }) {
    const { bookingData, actor, schemaGetter } = input;

    // Check if bookingData is the wrapper object from handleNewBooking
    const actualBookingData = bookingData.bookingData || bookingData;

    // Auto-route based on booking data properties
    if ("recurringCount" in actualBookingData && actualBookingData.recurringCount) {
      return this.createRecurringBooking({ bookingData, actor });
    }

    if (!("start" in actualBookingData)) {
      return this.createInstantBooking({ bookingData, actor });
    }

    if ("bookingUid" in actualBookingData && actualBookingData.bookingUid) {
      return this.createSeatedBooking({ bookingData, actor });
    }

    return this.createBooking({ bookingData, actor, schemaGetter });
  }
}
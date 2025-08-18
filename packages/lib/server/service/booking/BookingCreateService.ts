import handleNewRecurringBooking from "@calcom/features/bookings/handleNewRecurringBooking";
import type getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import type getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";
import type { HandleNewBookingService } from "@calcom/features/bookings/lib/handleNewBooking";
import type { BookingResponse } from "@calcom/features/bookings/types";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";

import type {
  CreateBookingData,
  CreateInstantBookingData,
  CreateBookingMeta,
  CreateRecurringBookingData,
} from "./BookingCreateTypes";

// Type for schema getter functions used in booking validation
// Properly typed to match what HandleNewBookingService expects
type BookingDataSchemaGetter = typeof getBookingDataSchema | typeof getBookingDataSchemaForApi;

// Minimal NextApiRequest shape needed for instant meetings
type InstantMeetingRequest = {
  body: Record<string, unknown>;
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  headers?: Record<string, string | string[]>;
  method?: string;
} & Record<string, unknown>;

export interface IBookingCreateServiceDependencies {
  handleNewBookingService: HandleNewBookingService;
}

export class BookingCreateService {
  constructor(private readonly dependencies: IBookingCreateServiceDependencies) {}

  async createBooking(input: {
    bookingData: CreateBookingData;
    bookingMeta: CreateBookingMeta;
    schemaGetter?: BookingDataSchemaGetter;
  }) {
    const { bookingData, schemaGetter } = input;

    const handlerInput = { bookingData };
    return this.dependencies.handleNewBookingService.handle(handlerInput, schemaGetter);
  }

  async createRecurringBooking(input: {
    bookingData: CreateRecurringBookingData;
    bookingMeta: CreateBookingMeta;
  }): Promise<BookingResponse[]> {
    return handleNewRecurringBooking({
      bookingData: input.bookingData,
      ...input.bookingMeta,
    });
  }

  async createInstantBooking(input: { bookingData: CreateInstantBookingData }) {
    const { bookingData } = input;

    // handleInstantMeeting expects a NextApiRequest-like object
    // We create a minimal request object that satisfies the interface
    const instantMeetingRequest: InstantMeetingRequest = {
      body: bookingData as unknown as Record<string, unknown>,
      query: {},
      cookies: {},
      headers: {},
      method: "POST",
    };
    // Use type assertion for compatibility with Next.js types
    return handleInstantMeeting(
      instantMeetingRequest as unknown as Parameters<typeof handleInstantMeeting>[0]
    );
  }

  async createSeatedBooking(input: { bookingData: CreateBookingData }) {
    const { bookingData } = input;

    // Seated bookings use the same handler as regular bookings
    // We adapt to the expected input format
    const handlerInput = { bookingData: bookingData };
    return this.dependencies.handleNewBookingService.handle(handlerInput);
  }

  // Simple create method that delegates to createBooking
  async create(input: {
    bookingData: CreateBookingData;
    bookingMeta: CreateBookingMeta;
    schemaGetter?: BookingDataSchemaGetter;
  }) {
    return this.createBooking(input);
  }
}

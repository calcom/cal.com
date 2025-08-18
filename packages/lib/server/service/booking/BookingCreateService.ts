import type getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import type getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";
import type { HandleNewBookingService } from "@calcom/features/bookings/lib/handleNewBooking";
import { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";

import type {
  CreateBookingInput,
  CreateRecurringBookingInput,
  CreateInstantBookingInput,
} from "./BookingCreateTypes";
import type { IBookingCreateService } from "./IBookingCreateService";

// Type for schema getter functions used in booking validation
// Properly typed to match what HandleNewBookingService expects
type BookingDataSchemaGetter = typeof getBookingDataSchema | typeof getBookingDataSchemaForApi;

// Type for booking data that comes from external sources (API, web)
type ExternalBookingData = Record<string, unknown>;

// handleNewBookingService historically expects loose typing
// We maintain type safety at our boundary and cast where necessary
type HandleNewBookingInput = Record<string, unknown>;

// Type for recurring booking handler input
type RecurringBookingHandlerInput = {
  bookingData: Record<string, unknown>[];
  userId?: number;
  hostname?: string;
  forcedSlug?: string;
  noEmail?: boolean;
  platformClientId?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  platformRescheduleUrl?: string;
  platformBookingLocation?: string;
  areCalendarEventsEnabled?: boolean;
};

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

export class BookingCreateService implements IBookingCreateService {
  constructor(private readonly dependencies: IBookingCreateServiceDependencies) {}

  async createBooking(input: { bookingData: ExternalBookingData; schemaGetter?: BookingDataSchemaGetter }) {
    const { bookingData, schemaGetter } = input;

    // handleNewBookingService requires specific shape - we adapt our types here
    // The service internally expects Record<string, any> for legacy reasons
    // We maintain type safety at our boundary and use assertion for compatibility
    const handlerInput = { bookingData } as Parameters<HandleNewBookingService["handle"]>[0];
    return this.dependencies.handleNewBookingService.handle(handlerInput, schemaGetter);
  }

  async createRecurringBooking(input: { bookingData: CreateRecurringBookingInput }) {
    const { bookingData } = input;

    // handleNewRecurringBooking expects an array of booking data
    // We adapt our single booking input to match the expected format
    const recurringInput: RecurringBookingHandlerInput = {
      bookingData: [bookingData as unknown as Record<string, unknown>],
    };
    // Use type assertion for compatibility with legacy function signature
    return handleNewRecurringBooking(recurringInput as Parameters<typeof handleNewRecurringBooking>[0]);
  }

  async createInstantBooking(input: { bookingData: CreateInstantBookingInput }) {
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

  async createSeatedBooking(input: { bookingData: CreateBookingInput }) {
    const { bookingData } = input;

    // Seated bookings use the same handler as regular bookings
    // We adapt to the expected input format
    const handlerInput = { bookingData: bookingData as unknown as Record<string, unknown> };
    return this.dependencies.handleNewBookingService.handle(
      handlerInput as Parameters<HandleNewBookingService["handle"]>[0]
    );
  }

  // Simple create method that delegates to createBooking
  async create(input: { bookingData: ExternalBookingData; schemaGetter?: BookingDataSchemaGetter }) {
    return this.createBooking(input);
  }
}

import type { HandleNewBookingService } from "@calcom/features/bookings/lib/handleNewBooking";
import { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";

import type {
  CreateBookingInput,
  CreateRecurringBookingInput,
  CreateInstantBookingInput,
} from "./BookingCreateTypes";
import type { IBookingCreateService } from "./IBookingCreateService";

export interface IBookingCreateServiceDependencies {
  handleNewBookingService: HandleNewBookingService;
}

export class BookingCreateService implements IBookingCreateService {
  constructor(private readonly dependencies: IBookingCreateServiceDependencies) {}

  async createBooking(input: { bookingData: any; schemaGetter?: any }) {
    const { bookingData, schemaGetter } = input;

    return this.dependencies.handleNewBookingService.handle({ bookingData }, schemaGetter);
  }

  async createRecurringBooking(input: { bookingData: CreateRecurringBookingInput }) {
    const { bookingData } = input;

    // handleNewRecurringBooking expects the data in a specific format
    // We cast to any here as we're adapting between our internal types and the external API
    return handleNewRecurringBooking(bookingData as any);
  }

  async createInstantBooking(input: { bookingData: CreateInstantBookingInput }) {
    const { bookingData } = input;

    // handleInstantMeeting expects a NextApiRequest-like object
    // We cast to any here as we're adapting between our internal types and the external API
    return handleInstantMeeting(bookingData as any);
  }

  async createSeatedBooking(input: { bookingData: CreateBookingInput }) {
    const { bookingData } = input;

    // Seated bookings use the same handler as regular bookings
    return this.dependencies.handleNewBookingService.handle({ bookingData });
  }

  async create(input: { bookingData: any; schemaGetter?: any }) {
    const { bookingData, schemaGetter } = input;

    // Check if bookingData is the wrapper object from handleNewBooking
    const actualBookingData = bookingData.bookingData || bookingData;

    // Auto-route based on booking data properties
    if ("recurringCount" in actualBookingData && actualBookingData.recurringCount) {
      return this.createRecurringBooking({ bookingData });
    }

    if (!("start" in actualBookingData)) {
      return this.createInstantBooking({ bookingData });
    }

    if ("bookingUid" in actualBookingData && actualBookingData.bookingUid) {
      return this.createSeatedBooking({ bookingData });
    }

    return this.createBooking({ bookingData, schemaGetter });
  }
}

// import { handleNewBooking } from "@calcom/features/bookings/lib/handleNewBooking";
import type { CheckBookingAndDurationLimitsService } from "@calcom/features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";
import type {
  CreateBookingData,
  CreateBookingMeta,
  BookingDataSchemaGetter,
} from "@calcom/features/bookings/lib/service/BookingCreateService/types";
import type { CacheService } from "@calcom/features/calendar-cache/lib/getShouldServeCache";
import type { BookingRepository } from "@calcom/lib/server/repository/booking";
import type { PrismaClient } from "@calcom/prisma";

export interface IBookingCreateServiceDependencies {
  cacheService: CacheService;
  checkBookingAndDurationLimitsService: CheckBookingAndDurationLimitsService;
  prismaClient: PrismaClient;
  bookingRepository: BookingRepository;
}
export class BookingCreateService {
  constructor(private readonly deps: IBookingCreateServiceDependencies) {}
  async create({
    bookingData,
    bookingMeta,
    schemaGetter,
  }: {
    bookingData: CreateBookingData;
    bookingMeta?: CreateBookingMeta;
    schemaGetter?: BookingDataSchemaGetter;
  }) {}
}

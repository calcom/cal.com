import { PrismaClient } from "@calcom/prisma";
import type { GetBookingsInput } from "@/schema/booking.schema";

import { BaseService } from "../base.service";

import { BookingRepository } from "@/repositories/booking.repository";

export class BookingService extends BaseService {
  private bookingRepository: BookingRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.bookingRepository = new BookingRepository(prisma);
  }

  async getUserBookings(
    queryParams: GetBookingsInput,
    user: { id: number; email: string; orgId?: number | null }
  ) {
    try {
      const data = await this.bookingRepository.getUserBookings(queryParams, user);
      return data;
    } catch (error) {
      this.logError("create", error);
      throw error;
    }
  }
}
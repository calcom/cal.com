import { BookingsRepository } from "@/ee/bookings/bookings.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BookingsService {
  constructor(private readonly bookingsRepository: BookingsRepository) {}

  async getUserBookings(userId: number) {
    return this.bookingsRepository.getBookingsByUserId(userId);
  }

  async getBookingById(bookingId: number) {
    return this.bookingsRepository.getBookingsById(bookingId);
  }
}

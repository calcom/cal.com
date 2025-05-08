import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/booking-references.repository";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { OutputBookingReferencesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output-booking-references.service";
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

@Injectable()
export class BookingReferencesService_2024_08_13 {
  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingReferencesRepository: BookingReferencesRepository_2024_08_13,
    private readonly outputBookingReferencesService: OutputBookingReferencesService_2024_08_13
  ) {}

  async getBookingReferences(bookingUid: string, userId: number) {
    const booking = await this.bookingsRepository.getByUidWithUser(bookingUid);

    if (!booking) {
      throw new NotFoundException(`Booking with uid ${bookingUid} not found`);
    }

    if (booking.user?.id !== userId) {
      throw new BadRequestException(`Booking with uid ${bookingUid} does not belong to user`);
    }

    const bookingReferences = await this.bookingReferencesRepository.getBookingReferences(booking.id);

    return this.outputBookingReferencesService.getOutputBookingReferences(bookingReferences);
  }

  async getOrgBookingReferences(bookingUid: string) {
    const booking = await this.bookingsRepository.getByUidWithUser(bookingUid);

    if (!booking) {
      throw new NotFoundException(`Booking with uid ${bookingUid} not found`);
    }

    const bookingReferences = await this.bookingReferencesRepository.getBookingReferences(booking.id);

    return this.outputBookingReferencesService.getOutputBookingReferences(bookingReferences);
  }
}

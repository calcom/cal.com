import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";
import { Injectable } from "@nestjs/common";

import { CreateBookingInput_2024_08_13 } from "@calcom/platform-types";

@Injectable()
export class BookingsService_2024_08_13 {
  constructor(
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly outputService: OutputBookingsService_2024_08_13
  ) {}

  async createBooking(body: CreateBookingInput_2024_08_13, clientId: string | undefined) {
    const bodyTransformed = this.inputService.transformInputCreateBooking(body);
    const booking: any = {};

    return this.outputService.getOutputBooking(booking);
  }
}

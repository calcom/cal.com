import { Injectable, Logger } from "@nestjs/common";

import type { AddAttendeesInput_2024_08_13 } from "@calcom/platform-types";

import { BookingAttendeesRepository_2024_08_13 } from "../booking-attendees.repository";
import { InputBookingsService_2024_08_13 } from "./input.service";
import { OutputBookingsService_2024_08_13 } from "./output.service";

@Injectable()
export class BookingAttendeesService_2024_08_13 {
  private readonly logger = new Logger("BookingAttendeesService_2024_08_13");

  constructor(
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly outputService: OutputBookingsService_2024_08_13,
    private readonly bookingAttendeesRepository: BookingAttendeesRepository_2024_08_13
  ) {}

  async addAttendees(bookingUid: string, input: AddAttendeesInput_2024_08_13) {
    const { attendeesToAdd } = await this.inputService.validateAndTransformAddAttendeesInput(
      bookingUid,
      input
    );

    const updatedBooking = await this.bookingAttendeesRepository.addAttendeesToBooking(
      bookingUid,
      attendeesToAdd
    );

    return this.outputService.getOutputBooking(updatedBooking);
  }
}

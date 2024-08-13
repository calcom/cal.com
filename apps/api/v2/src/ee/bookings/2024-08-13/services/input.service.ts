import { Injectable } from "@nestjs/common";

import { CreateBookingInput_2024_08_13 } from "@calcom/platform-types";

@Injectable()
export class InputBookingsService_2024_08_13 {
  transformInputCreateBooking(inputBooking: CreateBookingInput_2024_08_13) {
    return inputBooking;
  }
}

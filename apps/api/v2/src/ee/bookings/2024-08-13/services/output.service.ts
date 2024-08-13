import { Injectable } from "@nestjs/common";

import { Booking } from "@calcom/prisma/client";

@Injectable()
export class OutputBookingsService_2024_08_13 {
  getOutputBooking(databaseBooking: Booking) {
    return databaseBooking;
  }
}

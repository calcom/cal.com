import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { VERSION_2024_08_13_VALUE } from "@/lib/api-versions";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { Controller, Post, Logger, Body, Headers, UseGuards } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import {
  CreateBookingInput_2024_08_13,
  CreateBookingInputPipe,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";

@Controller({
  path: "/v2/bookings",
  version: VERSION_2024_08_13_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings")
export class BookingsController_2024_08_13 {
  private readonly logger = new Logger("BookingsController");

  constructor(private readonly bookingsService: BookingsService_2024_08_13) {}

  @Post("/")
  async createBooking(
    @Body(new CreateBookingInputPipe(CreateBookingInput_2024_08_13, RescheduleBookingInput_2024_08_13))
    body: CreateBookingInput_2024_08_13 | RescheduleBookingInput_2024_08_13,
    @Headers(X_CAL_CLIENT_ID) clientId: string | undefined
  ): Promise<CreateBookingOutput_2024_08_13> {
    console.log("asap body", JSON.stringify(body));
    const booking = await this.bookingsService.createBooking(body, clientId);

    return {
      status: "success",
      data: booking,
    };
  }
}

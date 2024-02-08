import { CreateBookingInput } from "@/ee/bookings/inputs/create-booking-input";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import {
  Controller,
  Post,
  Logger,
  UseGuards,
  Req,
  InternalServerErrorException,
  Body,
  HttpException,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { Request } from "express";
import { NextApiRequest } from "next/types";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { handleNewBooking, BookingResponse, HttpError } from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "ee/bookings",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class BookingsController {
  private readonly logger = new Logger("ee bookings controller");

  @Post("/create")
  async createBooking(
    @Req() req: Request & { userId?: number },
    @Body() _: CreateBookingInput,
    @GetUser() user: User
  ): Promise<ApiResponse<BookingResponse>> {
    req.userId = user.id;
    try {
      const booking = await handleNewBooking(req as unknown as NextApiRequest & { userId?: number }, {
        isNotAnApiCall: true,
      });
      return {
        status: SUCCESS_STATUS,
        data: booking,
      };
    } catch (err) {
      if (err instanceof HttpError) {
        const httpError = err as HttpError;
        throw new HttpException(
          httpError?.message ?? "Error while creating booking",
          httpError?.statusCode ?? 500
        );
      }
      throw new InternalServerErrorException(
        err instanceof Error ? err?.message : "Could not create booking"
      );
    }
  }
}

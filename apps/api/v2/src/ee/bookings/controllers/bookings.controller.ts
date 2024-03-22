import { CreateBookingInput } from "@/ee/bookings/inputs/create-booking.input";
import { CreateReccuringBookingInput } from "@/ee/bookings/inputs/create-reccuring-booking.input";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import {
  Controller,
  Post,
  Logger,
  Req,
  InternalServerErrorException,
  Body,
  HttpException,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { NextApiRequest } from "next/types";

import { BOOKING_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  handleNewBooking,
  BookingResponse,
  HttpError,
  handleNewRecurringBooking,
  handleInstantMeeting,
} from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "ee/bookings",
  version: "2",
})
@UseGuards(PermissionsGuard)
export class BookingsController {
  private readonly logger = new Logger("ee bookings controller");

  constructor(private readonly oAuthFlowService: OAuthFlowService) {}

  @Post("/")
  @Permissions([BOOKING_WRITE])
  async createBooking(
    @Req() req: Request & { userId?: number },
    @Body() _: CreateBookingInput
  ): Promise<ApiResponse<unknown>> {
    req.userId = await this.getOwnerId(req);
    req.body = { ...req.body, noEmail: true };
    try {
      const booking = await handleNewBooking(req as unknown as NextApiRequest & { userId?: number });
      return {
        status: SUCCESS_STATUS,
        data: booking,
      };
    } catch (err) {
      handleBookingErrors(err);
    }
    throw new InternalServerErrorException("Could not create booking.");
  }

  @Post("/reccuring")
  @Permissions([BOOKING_WRITE])
  async createReccuringBooking(
    @Req() req: Request & { userId?: number },
    @Body() _: CreateReccuringBookingInput[]
  ): Promise<ApiResponse<BookingResponse[]>> {
    req.userId = await this.getOwnerId(req);
    req.body = { ...req.body, noEmail: true };
    try {
      const createdBookings: BookingResponse[] = await handleNewRecurringBooking(
        req as unknown as NextApiRequest & { userId?: number }
      );
      return {
        status: SUCCESS_STATUS,
        data: createdBookings,
      };
    } catch (err) {
      handleBookingErrors(err, "recurring");
    }
    throw new InternalServerErrorException("Could not create recurring booking.");
  }

  @Post("/instant")
  @Permissions([BOOKING_WRITE])
  async createInstantBooking(
    @Req() req: Request & { userId?: number },
    @Body() _: CreateBookingInput
  ): Promise<ApiResponse<Awaited<ReturnType<typeof handleInstantMeeting>>>> {
    req.userId = await this.getOwnerId(req);
    req.body = { ...req.body, noEmail: true };
    try {
      const instantMeeting = await handleInstantMeeting(
        req as unknown as NextApiRequest & { userId?: number }
      );
      return {
        status: SUCCESS_STATUS,
        data: instantMeeting,
      };
    } catch (err) {
      handleBookingErrors(err, "instant");
    }
    throw new InternalServerErrorException("Could not create instant booking.");
  }

  async getOwnerId(req: Request): Promise<number | undefined> {
    try {
      const accessToken = req.get("Authorization")?.replace("Bearer ", "");
      if (accessToken) {
        return this.oAuthFlowService.getOwnerId(accessToken);
      }
    } catch (err) {
      this.logger.error(err);
    }
  }
}

function handleBookingErrors(err: Error | HttpError | unknown, type?: "recurring" | `instant`): void {
  const errMsg = `Error while creating ${type ? type + " " : ""}booking.`;
  if (err instanceof HttpError) {
    const httpError = err as HttpError;
    throw new HttpException(httpError?.message ?? errMsg, httpError?.statusCode ?? 500);
  }

  if (err instanceof Error) {
    const error = err as Error;
    throw new InternalServerErrorException(error?.message ?? errMsg);
  }

  throw new InternalServerErrorException(errMsg);
}

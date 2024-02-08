import { CreateBookingInput } from "@/ee/bookings/inputs/create-booking.input";
import { CreateReccuringBookingInput } from "@/ee/bookings/inputs/create-reccuring-booking.input";
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
import { handleNewBooking, BookingResponse, HttpError, AppsStatus } from "@calcom/platform-libraries";
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

  @Post("/reccuring/create")
  async createReccuringBooking(
    @Req() req: Request & { userId?: number },
    @Body() body: CreateReccuringBookingInput[],
    @GetUser() user: User
  ): Promise<ApiResponse<BookingResponse[]>> {
    req.userId = user.id;

    try {
      const createdBookings: BookingResponse[] = [];
      const allRecurringDates: { start: string | undefined; end: string | undefined }[] = body.map(
        (booking) => {
          return { start: booking.start, end: booking.end };
        }
      );
      const appsStatus: AppsStatus[] | undefined = undefined;
      const numSlotsToCheckForAvailability = 2;
      let thirdPartyRecurringEventId = null;
      for (let key = 0; key < body.length; key++) {
        const booking = body[key];

        const recurringEventReq: NextApiRequest & { userId?: number } = req as unknown as NextApiRequest & {
          userId?: number;
        };

        recurringEventReq.body = {
          ...booking,
          appsStatus,
          allRecurringDates,
          isFirstRecurringSlot: key == 0,
          thirdPartyRecurringEventId,
          numSlotsToCheckForAvailability,
          currentRecurringIndex: key,
          noEmail: key !== 0,
        };

        const promiseEachRecurringBooking: ReturnType<typeof handleNewBooking> = handleNewBooking(
          recurringEventReq,
          {
            isNotAnApiCall: true,
          }
        );

        const eachRecurringBooking = await promiseEachRecurringBooking;

        createdBookings.push(eachRecurringBooking);

        if (!thirdPartyRecurringEventId) {
          if (eachRecurringBooking.references && eachRecurringBooking.references.length > 0) {
            for (const reference of eachRecurringBooking.references!) {
              if (reference.thirdPartyRecurringEventId) {
                thirdPartyRecurringEventId = reference.thirdPartyRecurringEventId;
                break;
              }
            }
          }
        }
      }

      return {
        status: SUCCESS_STATUS,
        data: createdBookings,
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

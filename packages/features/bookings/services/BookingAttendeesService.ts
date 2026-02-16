import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { addGuestsHandler } from "@calcom/trpc/server/routers/viewer/bookings/addGuests.handler";
import type { TAddGuestsInputSchema } from "@calcom/trpc/server/routers/viewer/bookings/addGuests.schema";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";

type User = Pick<NonNullable<TrpcSessionUser>, "id" | "email" | "organizationId" | "uuid"> &
  Partial<Pick<NonNullable<TrpcSessionUser>, "profile">>;

type EmailVariant = "guest" | "attendee";

type AddAttendeeInput = {
  bookingId: number;
  guests: TAddGuestsInputSchema["guests"];
  user: User;
  emailsEnabled?: boolean;
  emailVariant?: EmailVariant;
  actionSource: ActionSource;
};

export class BookingAttendeesService {
  async addAttendee({
    bookingId,
    guests,
    user,
    emailsEnabled = true,
    emailVariant = "attendee",
    actionSource,
  }: AddAttendeeInput): Promise<{ message: string }> {
    try {
      return await addGuestsHandler({
        ctx: { user },
        input: {
          bookingId,
          guests,
        },
        emailsEnabled,
        emailVariant,
        actionSource,
      });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw this.convertTRPCErrorToErrorWithCode(error);
      }
      throw error;
    }
  }

  private convertTRPCErrorToErrorWithCode(error: TRPCError): ErrorWithCode {
    switch (error.code) {
      case "NOT_FOUND":
        return ErrorWithCode.Factory.NotFound(error.message);
      case "FORBIDDEN":
        return ErrorWithCode.Factory.Forbidden(error.message);
      case "BAD_REQUEST":
        return ErrorWithCode.Factory.BadRequest(error.message);
      case "INTERNAL_SERVER_ERROR":
        return ErrorWithCode.Factory.InternalServerError(error.message);
      default:
        return new ErrorWithCode(ErrorCode.InternalServerError, error.message);
    }
  }
}

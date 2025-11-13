import type { Booking, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { Prisma } from "@calcom/prisma/client";

interface BookingCancellationDataParams {
  originalBooking: Pick<Booking, "id" | "metadata">;
  newUser: Pick<User, "name" | "email">;
}

/**
 * Builder for creating cancellation data for the original booking during reassignment
 * Follows Single Responsibility Principle - only builds cancellation data
 */
export class BookingCancellationDataBuilder {
  /**
   * Builds the data structure for cancelling the original booking
   * @param params - The parameters needed to build cancellation data
   * @returns Prisma booking update data with where clause and select
   */
  static build({ originalBooking, newUser }: BookingCancellationDataParams): {
    where: Prisma.BookingWhereUniqueInput;
    data: Prisma.BookingUpdateInput;
    select: Prisma.BookingSelect;
  } {
    return {
      where: { id: originalBooking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: `Reassigned to ${newUser.name || newUser.email}`,
        metadata:
          typeof originalBooking.metadata === "object" && originalBooking.metadata !== null
            ? originalBooking.metadata
            : undefined,
      },
      select: {
        id: true,
        uid: true,
        metadata: true,
        status: true,
      },
    };
  }
}


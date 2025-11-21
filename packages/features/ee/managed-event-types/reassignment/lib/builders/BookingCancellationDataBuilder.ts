import type { Booking, User } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";

interface BookingCancellationDataParams {
  originalBooking: Pick<Booking, "id" | "metadata">;
  newUser: Pick<User, "name" | "email">;
}

const cancellationSelect = {
  id: true,
  uid: true,
  metadata: true,
  status: true,
} as const satisfies Prisma.BookingSelect;

export type CancelledBookingResult = Prisma.BookingGetPayload<{ select: typeof cancellationSelect }>;

export class BookingCancellationDataBuilder {
  /**
   * Builds the data structure for cancelling the original booking.
   * Note: status is not included here as it's enforced by the repository's cancelBooking method.
   * @param params - The parameters needed to build cancellation data
   * @returns Where clause, additional data (without status), and select clause
   */
  static build({ originalBooking, newUser }: BookingCancellationDataParams): {
    where: Prisma.BookingWhereUniqueInput;
    data: Omit<Prisma.BookingUpdateInput, "status">;
    select: typeof cancellationSelect;
  } {
    return {
      where: { id: originalBooking.id },
      data: {
        cancellationReason: `Reassigned to ${newUser.name || newUser.email}`,
        metadata:
          typeof originalBooking.metadata === "object" && originalBooking.metadata !== null
            ? originalBooking.metadata
            : undefined,
      },
      select: cancellationSelect,
    };
  }
}


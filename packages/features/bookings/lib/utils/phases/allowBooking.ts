import dayjs from "@calcom/dayjs";
import type { BookingRepository } from "@calcom/lib/server/repository/booking";
import { SchedulingType } from "@calcom/prisma/enums";

import type { BookingValidationOutputContext } from "./bookingValidation";

// Use ReturnType from booking repository for type safety
type ExistingBooking = Awaited<ReturnType<BookingRepository["getValidBookingFromEventTypeForAttendee"]>>;

export interface ExistingBookingResponse extends Omit<NonNullable<ExistingBooking>, "user"> {
  user: Omit<NonNullable<ExistingBooking>["user"], "email"> & { email: null };
  paymentRequired: boolean;
  seatReferenceUid: string;
  luckyUsers: number[];
  isDryRun: boolean;
  troubleshooterData?: Record<string, unknown>;
  paymentUid?: string;
  paymentId?: number;
}

export type AllowBookingInputContext = BookingValidationOutputContext & {
  isConfirmedByDefault: boolean;
  userReschedulingIsOwner: boolean;
  paymentAppData: {
    price: number;
  };
  troubleshooterData?: Record<string, unknown>;
};

export type AllowBookingOutputContext = {
  shouldProceed: boolean;
  existingBookingResponse?: ExistingBookingResponse;
};

export interface IAllowBookingServiceDependencies {
  bookingRepository: BookingRepository;
}

export interface IAllowBookingService {
  checkAllowed(context: AllowBookingInputContext): Promise<AllowBookingOutputContext>;
}

export class AllowBookingService implements IAllowBookingService {
  constructor(private readonly deps: IAllowBookingServiceDependencies) {}

  async checkAllowed(context: AllowBookingInputContext): Promise<AllowBookingOutputContext> {
    const {
      eventType,
      bookerEmail,
      bookerPhoneNumber,
      reqBody,
      isDryRun,
      isConfirmedByDefault,
      userReschedulingIsOwner,
      paymentAppData,
      troubleshooterData,
    } = context;

    // For unconfirmed bookings or round robin bookings with the same attendee and timeslot, return the original booking
    if (
      (!isConfirmedByDefault && !userReschedulingIsOwner) ||
      eventType.schedulingType === SchedulingType.ROUND_ROBIN
    ) {
      const requiresPayment = !Number.isNaN(paymentAppData.price) && paymentAppData.price > 0;

      const existingBooking = await this.deps.bookingRepository.getValidBookingFromEventTypeForAttendee({
        eventTypeId: eventType.id,
        bookerEmail,
        bookerPhoneNumber,
        startTime: new Date(dayjs(reqBody.start).utc().format()),
        filterForUnconfirmed: !isConfirmedByDefault,
      });

      if (existingBooking) {
        const hasPayments = existingBooking.payment.length > 0;
        const isPaidBooking = existingBooking.paid || !hasPayments;

        const shouldShowPaymentForm = requiresPayment && !isPaidBooking;

        const firstPayment = shouldShowPaymentForm ? existingBooking.payment[0] : undefined;

        const bookingResponse = {
          ...existingBooking,
          user: {
            ...existingBooking.user,
            email: null,
          },
          paymentRequired: shouldShowPaymentForm,
          seatReferenceUid: "",
        };

        return {
          shouldProceed: false,
          existingBookingResponse: {
            ...bookingResponse,
            luckyUsers: bookingResponse.userId ? [bookingResponse.userId] : [],
            isDryRun,
            ...(isDryRun ? { troubleshooterData } : {}),
            paymentUid: firstPayment?.uid,
            paymentId: firstPayment?.id,
          },
        };
      }
    }

    return {
      shouldProceed: true,
    };
  }
}

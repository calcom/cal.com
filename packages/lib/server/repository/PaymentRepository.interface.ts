import type { JsonValue } from "@prisma/client/runtime/library";

export interface PaymentWithBookingCredentials {
  id: number;
  amount: number;
  success: boolean;
  bookingId: number;
  booking: {
    user: {
      credentials: Array<{
        key: JsonValue;
      }>;
    } | null;
  } | null;
}

export interface IPaymentRepository {
  findByExternalIdIncludeBookingUserCredentials(
    externalId: string,
    credentialType: string
  ): Promise<PaymentWithBookingCredentials | null>;
}

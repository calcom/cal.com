import type { JsonValue } from "@calcom/types/Json";

export interface BookingPaymentWithCredentials {
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

export interface IBookingPaymentRepository {
  findByExternalIdIncludeBookingUserCredentialsOfType(params: {
    externalId: string;
    credentialType: string;
  }): Promise<BookingPaymentWithCredentials | null>;
}

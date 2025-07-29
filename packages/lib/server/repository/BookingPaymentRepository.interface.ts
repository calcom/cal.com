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

export interface CreatePaymentData {
  uid: string;
  app: { connect: { slug: string } };
  booking: { connect: { id: number } };
  amount: number;
  fee: number;
  externalId: string;
  refunded: boolean;
  success: boolean;
  currency: string;
  data: Record<string, any>;
}

export interface IBookingPaymentRepository {
  findByExternalIdIncludeBookingUserCredentials(
    externalId: string,
    credentialType: string
  ): Promise<BookingPaymentWithCredentials | null>;

  createPaymentRecord(data: CreatePaymentData): Promise<any>;
}

import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  IBookingPaymentRepository,
  BookingPaymentWithCredentials,
  CreatePaymentData,
} from "./BookingPaymentRepository.interface";

export class KyselyBookingPaymentRepository implements IBookingPaymentRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async findByExternalIdIncludeBookingUserCredentials(
    externalId: string,
    credentialType: string
  ): Promise<BookingPaymentWithCredentials | null> {
    // First get the payment with booking info
    const payment = await this.dbRead
      .selectFrom("Payment")
      .leftJoin("Booking", "Booking.id", "Payment.bookingId")
      .select([
        "Payment.id",
        "Payment.amount",
        "Payment.success",
        "Payment.bookingId",
        "Booking.userId as bookingUserId",
      ])
      .where("Payment.externalId", "=", externalId)
      .executeTakeFirst();

    if (!payment) return null;

    // Get user credentials if booking has a user
    let credentials: Array<{ key: unknown }> = [];
    if (payment.bookingUserId) {
      const credentialResults = await this.dbRead
        .selectFrom("Credential")
        .select("key")
        .where("userId", "=", payment.bookingUserId)
        .where("type", "=", credentialType)
        .execute();

      credentials = credentialResults.map((c) => ({ key: c.key }));
    }

    return {
      id: payment.id,
      amount: payment.amount,
      success: payment.success,
      bookingId: payment.bookingId,
      booking: payment.bookingUserId
        ? {
            user: {
              credentials,
            },
          }
        : null,
    };
  }

  async createPaymentRecord(data: CreatePaymentData) {
    // Get the app ID from slug
    const app = await this.dbRead
      .selectFrom("App")
      .select("slug")
      .where("slug", "=", data.app.connect.slug)
      .executeTakeFirst();

    if (!app) {
      throw new Error(`App with slug ${data.app.connect.slug} not found`);
    }

    const result = await this.dbWrite
      .insertInto("Payment")
      .values({
        uid: data.uid,
        appId: data.app.connect.slug,
        bookingId: data.booking.connect.id,
        amount: data.amount,
        fee: data.fee,
        externalId: data.externalId,
        refunded: data.refunded,
        success: data.success,
        currency: data.currency,
        data: data.data,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  }
}

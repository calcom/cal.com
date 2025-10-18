import { v4 as uuidv4 } from "uuid";
import type z from "zod";

import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { IBookingPaymentRepository } from "@calcom/lib/server/repository/BookingPaymentRepository.interface";
import { PrismaBookingPaymentRepository } from "@calcom/lib/server/repository/PrismaBookingPaymentRepository";
import type { Booking, Payment, PaymentOption } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import appConfig from "../config.json";
import { btcpayCredentialKeysSchema } from "./btcpayCredentialKeysSchema";
import { convertFromSmallestToPresentableCurrencyUnit } from "./currencyOptions";

const log = logger.getSubLogger({ prefix: ["payment-service:btcpayserver"] });

interface BTCPayInvoice {
  id: string;
  checkoutLink: string;
  status: string;
  amount: string;
  currency: string;
  createdTime: number;
  expirationTime: number;
  metadata?: Record<string, any>;
  checkout?: Record<string, any>;
  receipt?: Record<string, any>;
  payments?: Array<{
    id: string;
    amount: string;
    paymentMethod: string;
  }>;
  [key: string]: any;
}

export class PaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof btcpayCredentialKeysSchema> | null;
  private bookingPaymentRepository: IBookingPaymentRepository;

  constructor(
    credentials: { key: Prisma.JsonValue },
    bookingPaymentRepository: IBookingPaymentRepository = new PrismaBookingPaymentRepository()
  ) {
    const keyParsing = btcpayCredentialKeysSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      this.credentials = keyParsing.data;
    } else {
      this.credentials = null;
    }
    this.bookingPaymentRepository = bookingPaymentRepository;
  }

  private async BTCPayApiCall(endpoint: string, options: RequestInit = {}) {
    if (!this.credentials) throw new Error("BTCPay server credentials not found");

    const serverUrl = this.credentials.serverUrl.endsWith("/")
      ? this.credentials.serverUrl.slice(0, -1)
      : this.credentials.serverUrl;
    const url = `${serverUrl}${endpoint}`;
    const headers = {
      Authorization: `token ${this.credentials.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BTCPay server API error (${response.status}): ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    userId: Booking["userId"],
    username: string | null,
    bookerName: string,
    paymentOption: PaymentOption,
    bookerEmail: string,
    bookerPhoneNumber?: string | null,
    eventTitle?: string,
    bookingTitle?: string
  ) {
    try {
      if (!this.credentials?.storeId) {
        throw new Error("BTCPay server: Store ID not found");
      }

      const uid = uuidv4();
      const invoiceRequest = {
        metadata: {
          orderId: `cal-booking-${bookingId}`,
          itemDesc: bookingTitle || `Booking #${bookingId}`,
          appId: "cal.com",
          referenceId: uid,
          customerName: bookerName,
          customerEmail: bookerEmail,
          bookingDescription: bookingTitle || `Booking with ${bookerName}`,
        },
        checkout: {
          buyerEmail: bookerEmail,
        },
        receipt: {
          enabled: true,
        },
        amount: convertFromSmallestToPresentableCurrencyUnit(payment.amount, payment.currency),
        currency: payment.currency === "BTC" ? "SATS" : payment.currency,
        additionalSearchTerms: [`cal-booking-${bookingId}`, bookerName, bookerEmail],
      };
      const invoiceResponse = (await this.BTCPayApiCall(
        `/api/v1/stores/${this.credentials.storeId}/invoices`,
        { method: "POST", body: JSON.stringify(invoiceRequest) }
      )) as BTCPayInvoice;

      const paymentData = await this.bookingPaymentRepository.createPaymentRecord({
        uid,
        app: { connect: { slug: appConfig.slug } },
        booking: { connect: { id: bookingId } },
        amount: payment.amount,
        externalId: invoiceResponse.id,
        currency: payment.currency,
        fee: 0,
        success: false,
        refunded: false,
        data: Object.assign(
          {},
          {
            invoice: {
              ...invoiceResponse,
              isPaid: false,
              attendee: { name: bookerName, email: bookerEmail },
            },
          }
        ),
      });
      if (!paymentData) throw new Error("Failed to store Payment data");
      return paymentData;
    } catch (error) {
      log.error("BTCPay server: Payment could not be created", bookingId, safeStringify(error));
      throw new Error(ErrorCode.PaymentCreationFailure);
    }
  }

  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
  async refund(): Promise<Payment> {
    throw new Error("BTCPay Server does not support automatic refunds for Bitcoin payments");
  }

  async collectCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId: number,
    _bookerEmail: string,
    _paymentOption: PaymentOption
  ): Promise<Payment> {
    throw new Error("Method not implemented");
  }

  chargeCard(
    _payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    _bookingId: number
  ): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async afterPayment(
    _event: CalendarEvent,
    _booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    _paymentData: Payment
  ): Promise<void> {
    return Promise.resolve();
  }

  deletePayment(_paymentId: number): Promise<boolean> {
    return Promise.resolve(false);
  }

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}

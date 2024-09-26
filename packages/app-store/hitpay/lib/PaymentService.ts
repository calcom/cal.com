import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import type z from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import appConfig from "../config.json";
import { NEXT_PUBLIC_API_HITPAY, supportedPaymentMethods } from "./constants";
import { hitpayCredentialKeysSchema } from "./hitpayCredentialKeysSchema";

const log = logger.getSubLogger({ prefix: ["payment-service:hitpay"] });

export class PaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof hitpayCredentialKeysSchema> | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const keyParsing = hitpayCredentialKeysSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      this.credentials = keyParsing.data;
    } else {
      this.credentials = null;
    }
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    userId: Booking["userId"],
    username: string | null,
    bookerName: string,
    paymentOption: PaymentOption,
    bookerEmail: string
    // bookerPhoneNumber?: string | null,
    // eventTitle?: string,
    // bookingTitle?: string
  ) {
    try {
      const booking = await prisma.booking.findFirst({
        select: {
          uid: true,
          title: true,
        },
        where: {
          id: bookingId,
        },
      });
      if (!booking || !this.credentials?.apiKey) {
        throw new Error("Alby: Booking or Lightning address not found");
      }

      const uid = uuidv4();

      const requestUrl = `${NEXT_PUBLIC_API_HITPAY}/v1/payment-requests`;
      const redirectUri = `${WEBAPP_URL}/api/integrations/${appConfig.slug}/callback`;
      const webhookUri = `${WEBAPP_URL}/api/integrations/${appConfig.slug}/webhook`;

      const formData = {
        amount: payment.amount,
        currency: payment.currency,
        payment_methods: supportedPaymentMethods,
        email: bookerEmail,
        name: bookerName,
        redirect_url: redirectUri,
        webhook: webhookUri,
      };

      const response = await axios.post(requestUrl, qs.stringify(formData), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          "X-BUSINESS-API-KEY": this.credentials.apiKey,
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const data = response.data;

      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: {
            connect: {
              slug: "hitpay",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: data.amount,
          externalId: data.id,
          currency: data.currency,
          data: Object.assign({}, data, { isPaid: false }) as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
        },
      });

      if (!paymentData) {
        throw new Error();
      }
      return paymentData;
    } catch (error) {
      log.error("Alby: Payment could not be created", bookingId, safeStringify(error));
      throw new Error(ErrorCode.PaymentCreationFailure);
    }
  }
  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
  async refund(): Promise<Payment> {
    throw new Error("Method not implemented.");
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
  getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
  afterPayment(
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

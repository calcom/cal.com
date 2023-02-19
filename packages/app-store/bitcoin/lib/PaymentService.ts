// TODO: Add with turbo?
import invoice from "@node-lightning/invoice";
import type { Booking, Payment, Prisma } from "@prisma/client";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { sendAwaitingPaymentEmail } from "@calcom/emails";
import type { IAbstractPaymentService } from "@calcom/lib/PaymentService";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

import fetchInvoiceFromLnName from "./invoiceFetcher";

import { getBitcoinAppKeys } from "./getBitcoinAppKeys";
import { bitcoinCredentialSchema } from "./bitcoinCredentialSchema";

// Mock
const mockInvoice =
  "lnbc1u1p3mjl9xpp527xj0nhfray26nrkd5j8lnkhnltlc3025yx6kghjvt9nnkeselsqdpzgdhkjmjtd96yq4esxqcrqvpsx9tn2vp3xscqzpgxqyz5vqsp52lw0380j6pyys3gwka2j8e2m9fvguyslltzs5gzvdx3h6hf7ywws9qyyssqukxlkd60kmvcxwxdaz7gcuw6tuz4arsp2m5elnklxmttajr9jdkxj40l0ffgkeyz73yhhgj44cczr2weae7sg53dtf3lgjz9h6mhqfsqhsgsuv";

export class PaymentService implements IAbstractPaymentService {
  constructor(credentials: { key: Prisma.JsonValue }) {
    // parse credentials key
    // How to get the app values?
    this.credentials = bitcoinCredentialSchema.parse(credentials.key);
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"]
  ) {
    try {
      // Load ln options keys
      const bitcoinAppKeys = getBitcoinAppKeys();

      // Parse keys with zod
      // Parse keys to get ln-name/ln-invoice and price
      const { ln_name_url, payment_fee_fixed } = bitcoinCredentialSchema.parse(bitcoinAppKeys?.keys);

      const paymentIntent = /* await fetchInvoiceFromLnName(ln_name_url, payment_fee_fixed); */ mockInvoice;

      const paymentData = await prisma.payment.create({
        data: {
          type: "BITCOIN", // PaymentType.BITCOIN // Needs prisma migration?,
          uid: uuidv4(),
          app: {
            connect: {
              slug: "bitcoin",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          fee: 0,
          currency: payment.currency,
          success: false,
          refunded: false,
          data: paymentIntent,
          externalId: paymentIntent,
        },
      });

      if (!paymentData) {
        throw new Error();
      }
      return paymentData;
    } catch (error) {
      console.error(error);
      throw new Error("Payment could not be created");
    }
  }

  // This needs a paramter to be able to do anything
  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async refund(paymentId: Payment["id"]): Promise<Payment> {
    throw new Error("Lightning Payments are non-refundable");
  }

  async afterPayment(
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    paymentData: Payment
  ): Promise<void> {
    await sendAwaitingPaymentEmail({
      ...event,
      paymentInfo: {
        link: `lightning://${paymentData.externalId}`, // External Id is Invoice
      },
    });
  }

  async deletePayment(paymentId: Payment["id"]): Promise<boolean> {
    try {
      const payment = await prisma.payment.findFirst({
        where: {
          id: paymentId,
        },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // Don't we need the Payment Parameter here?
  // Both need to be async
  // getPaymentPaidStatus(paymentId: Payment["id"]) ?
  async getPaymentPaidStatus(): Promise<string> {
    // Mock
    // PaymentId -> Payment
    // const externalId = payment.externalId;
    const externalId = mockInvoice;
    let result;
    try {
      result = await fetch(`https://api.ln-gateway.com/api/v1/isInvoicePaid?invoice=${externalId}`);
    } catch (ex) {
      throw new Error(`Could not update Payment: ${ex}`);
    }
    const data = await result.json();
    return data.paid;
  }

  // Don't we need the Payment Parameter here?
  // getPaymentDetails(paymentId: Payment["id"]) ?
  async getPaymentDetails(): Promise<Payment> {
    const invoice = { decode: () => "" }; // Mock for Package
    // PaymentId -> Payment
    // const externalId = payment.externalId;
    const externalId = mockInvoice;
    return invoice.decode();
  }
}

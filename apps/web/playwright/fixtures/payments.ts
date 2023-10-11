import type { Page } from "@playwright/test";
import type { Payment } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

type PaymentFixture = ReturnType<typeof createPaymentFixture>;

// creates a user fixture instance and stores the collection
export const createPaymentsFixture = (page: Page) => {
  const store = { payments: [], page } as { payments: PaymentFixture[]; page: typeof page };
  return {
    create: async (
      bookingId: number,
      { success = false, refunded = false }: { success?: boolean; refunded?: boolean } = {}
    ) => {
      const payment = await prisma.payment.create({
        data: {
          uid: uuidv4(),
          amount: 20000,
          fee: 160,
          currency: "usd",
          success,
          refunded,
          app: {
            connect: {
              slug: "stripe",
            },
          },
          data: {},
          externalId: `DEMO_PAYMENT_FROM_DB_${Date.now()}`,
          booking: {
            connect: {
              id: bookingId,
            },
          },
        },
      });
      const paymentFixture = createPaymentFixture(payment, store.page);
      store.payments.push(paymentFixture);
      return paymentFixture;
    },
    get: () => store.payments,
    delete: async (id: number) => {
      await prisma.payment.delete({
        where: { id },
      });
      store.payments = store.payments.filter((b) => b.id !== id);
    },
  };
};

// creates the single user fixture
const createPaymentFixture = (payment: Payment, page: Page) => {
  const store = { payment, page };

  // self is a reflective method that return the Prisma object that references this fixture.
  return {
    id: store.payment.id,
    self: async () => await prisma.payment.findUnique({ where: { id: store.payment.id } }),
    delete: async () => await prisma.payment.delete({ where: { id: store.payment.id } }),
  };
};

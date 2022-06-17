import { z } from "zod";

import prisma from "@lib/prisma";

const getCurrency = async (userId: number) => {
  const paymentCredential = await prisma.credential.findFirst({
    where: {
      userId: userId,
      type: {
        contains: "_payment",
      },
    },
    select: {
      type: true,
      key: true,
    },
  });

  if (paymentCredential === null) return "usd";

  if (paymentCredential.type === "stripe_payment") {
    const stripeKeySchema = z.object({
      default_currency: z.string(),
    });
    const { default_currency } = stripeKeySchema.parse(paymentCredential.key);
    return default_currency;
  }
};

export default getCurrency;

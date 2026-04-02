import process from "node:process";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import Stripe from "stripe";

export async function getStripeCustomerIdFromUserId(userId: number) {
  // Get user
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
      name: true,
      metadata: true,
    },
  });

  if (!user?.email) throw new HttpError({ statusCode: 404, message: "User email not found" });

  const customerId = await getStripeCustomerId(user);

  return customerId;
}

const userType = {
  email: true,
  metadata: true,
} satisfies Prisma.UserSelect;

export type UserType = Prisma.UserGetPayload<{ select: typeof userType }>;
/** This will retrieve the customer ID from Stripe or create it if it doesn't exists yet. */
export async function getStripeCustomerId(user: UserType): Promise<string> {
  let customerId: string | null = null;

  if (user?.metadata && typeof user.metadata === "object" && "stripeCustomerId" in user.metadata) {
    customerId = (user?.metadata as Prisma.JsonObject).stripeCustomerId as string;
  } else {
    /* We fallback to finding the customer by email (which is not optimal) */
    const customersResponse = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    if (customersResponse.data[0]?.id) {
      customerId = customersResponse.data[0].id;
    } else {
      /* Creating customer on Stripe and saving it on prisma */
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    await prisma.user.update({
      where: {
        email: user.email,
      },
      data: {
        metadata: {
          ...(user.metadata as Prisma.JsonObject),
          stripeCustomerId: customerId,
        },
      },
    });
  }

  return customerId;
}

const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY || "";
export const stripe = new Stripe(stripePrivateKey, {
  apiVersion: "2020-08-27",
});

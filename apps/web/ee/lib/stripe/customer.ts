import { Prisma } from "@prisma/client";

import stripe from "@ee/lib/stripe/server";

import { HttpError as HttpCode } from "@lib/core/http/error";
import { prisma } from "@lib/prisma";

export async function getStripeCustomerFromUser(userId: number) {
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

  if (!user?.email) throw new HttpCode({ statusCode: 404, message: "User email not found" });

  const customerId = await getStripeCustomerId(user);

  return customerId;
}

const userType = Prisma.validator<Prisma.UserArgs>()({
  select: {
    email: true,
    metadata: true,
  },
});

type UserType = Prisma.UserGetPayload<typeof userType>;
export async function getStripeCustomerId(user: UserType): Promise<string | null> {
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
    }
  }

  return customerId;
}

export async function deleteStripeCustomer(user: UserType): Promise<string | null> {
  const customerId = await getStripeCustomerId(user);

  if (!customerId) {
    console.warn("No stripe customer found for user:" + user.email);
    return null;
  }

  //delete stripe customer
  const deletedCustomer = await stripe.customers.del(customerId);

  return deletedCustomer.id;
}

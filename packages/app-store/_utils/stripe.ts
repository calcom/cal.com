import type { Prisma } from "@prisma/client";
import Stripe from "stripe";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

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

export async function getStripeCustomerIdFromOrganizationId(organizationId: number) {
  const organization = await prisma.team.findUnique({
    where: {
      id: organizationId,
      isOrganization: true,
    },
    select: {
      id: true,
      name: true,
      stripeCustomerId: true,
      members: {
        where: {
          accepted: true,
          role: { in: ["OWNER", "ADMIN"] },
        },
        take: 1,
        select: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!organization) throw new HttpError({ statusCode: 404, message: "Organization not found" });

  const customerId = await getStripeCustomerIdForOrganization(organization);

  return customerId;
}

const userType = {
  select: {
    email: true,
    metadata: true,
  },
} satisfies Prisma.UserArgs;

export type UserType = Prisma.UserGetPayload<typeof userType>;
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

const organizationType = {
  select: {
    id: true,
    name: true,
    stripeCustomerId: true,
    members: {
      where: {
        accepted: true,
        role: { in: ["OWNER", "ADMIN"] },
      },
      take: 1,
      select: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    },
  },
} satisfies Prisma.TeamArgs;

export type OrganizationType = Prisma.TeamGetPayload<typeof organizationType>;

export async function getStripeCustomerIdForOrganization(organization: OrganizationType): Promise<string> {
  let customerId: string | null = null;

  if (organization.stripeCustomerId) {
    customerId = organization.stripeCustomerId;
  } else {
    const ownerUser = organization.members[0]?.user;
    if (!ownerUser?.email) {
      throw new HttpError({ statusCode: 404, message: "Organization owner email not found" });
    }

    /* We fallback to finding the customer by organization name and owner email */
    const customersResponse = await stripe.customers.list({
      email: ownerUser.email,
      limit: 1,
    });
    if (customersResponse.data[0]?.id) {
      customerId = customersResponse.data[0].id;
    } else {
      /* Creating customer on Stripe for the organization */
      const customer = await stripe.customers.create({
        email: ownerUser.email,
        name: organization.name || ownerUser.name || undefined,
        description: `Organization: ${organization.name}`,
      });
      customerId = customer.id;
    }

    await prisma.team.update({
      where: {
        id: organization.id,
      },
      data: {
        stripeCustomerId: customerId,
      },
    });
  }

  return customerId;
}

const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY || "";
export const stripe = new Stripe(stripePrivateKey, {
  apiVersion: "2020-08-27",
});

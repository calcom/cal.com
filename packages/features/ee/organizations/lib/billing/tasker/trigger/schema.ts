import { z } from "zod";

export const platformBillingTaskSchema: z.ZodObject<
  {
    userId: z.ZodNumber;
  },
  "strip",
  z.ZodTypeAny,
  {
    userId: number;
  },
  {
    userId: number;
  }
> = z.object({
  userId: z.number(),
});

export const platformBillingCancelUsageIncrementTaskSchema: z.ZodObject<
  {
    bookingUid: z.ZodString;
  },
  "strip",
  z.ZodTypeAny,
  {
    bookingUid: string;
  },
  {
    bookingUid: string;
  }
> = z.object({
  bookingUid: z.string(),
});

export const platformBillingRescheduleUsageIncrementTaskSchema: z.ZodObject<
  {
    bookingUid: z.ZodString;
  },
  "strip",
  z.ZodTypeAny,
  {
    bookingUid: string;
  },
  {
    bookingUid: string;
  }
> = z.object({
  bookingUid: z.string(),
});

export const countActiveManagedUsersTaskSchema: z.ZodObject<
  {
    organizationId: z.ZodNumber;
    periodStart: z.ZodNumber;
    periodEnd: z.ZodNumber;
  },
  "strip",
  z.ZodTypeAny,
  {
    organizationId: number;
    periodStart: number;
    periodEnd: number;
  },
  {
    organizationId: number;
    periodStart: number;
    periodEnd: number;
  }
> = z.object({
  organizationId: z.number(),
  periodStart: z.number(),
  periodEnd: z.number(),
});

export const invoiceActiveManagedUsersTaskSchema: z.ZodObject<{
  organizationIds: z.ZodArray<z.ZodNumber>;
  periodStart: z.ZodNumber;
  periodEnd: z.ZodNumber;
  billingEmail: z.ZodString;
  pricePerUserInCents: z.ZodNumber;
  currency: z.ZodDefault<z.ZodString>;
  stripeCustomerId: z.ZodOptional<z.ZodString>;
}> = z.object({
  organizationIds: z.array(z.number()),
  periodStart: z.number(),
  periodEnd: z.number(),
  billingEmail: z.string().email(),
  pricePerUserInCents: z.number().positive(),
  currency: z.string().default("usd"),
  stripeCustomerId: z.string().optional(),
});

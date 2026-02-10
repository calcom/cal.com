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
    rescheduledTime: z.ZodDate;
  },
  "strip",
  z.ZodTypeAny,
  {
    bookingUid: string;
    rescheduledTime: Date;
  },
  {
    bookingUid: string;
    rescheduledTime: Date;
  }
> = z.object({
  bookingUid: z.string(),
  rescheduledTime: z.coerce.date(),
});

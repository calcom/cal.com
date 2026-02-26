import { z } from "zod";

export type TGetUpcomingBookingsByDomainInputSchema = {
  bookingUid: string;
  reportType?: "EMAIL" | "DOMAIN";
};

export const ZGetUpcomingBookingsByDomainInputSchema = z.object({
  bookingUid: z.string(),
  reportType: z.enum(["EMAIL", "DOMAIN"]).optional().default("DOMAIN"),
});

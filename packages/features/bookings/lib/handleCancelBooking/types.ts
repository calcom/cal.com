import type { NextApiRequest } from "next";
import type { BookingToDelete } from "../getBookingToDelete";

export type AppRouterRequest = { appDirRequestBody: unknown };
export type CustomRequest = (NextApiRequest | AppRouterRequest) & {
  userId?: number;
  bookingToDelete?: BookingToDelete;
  platformClientId?: string;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  arePlatformEmailsEnabled?: boolean;
};

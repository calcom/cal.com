import type { Tracking } from "@calcom/prisma/client";

export interface TrackingRepositoryInterface {
  findByBookingUid(bookingUid: string): Promise<Tracking | null>;
}

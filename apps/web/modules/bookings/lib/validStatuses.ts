export const validStatuses = ["upcoming", "recurring", "past", "cancelled", "unconfirmed"] as const;

export type BookingListingStatus = (typeof validStatuses)[number];

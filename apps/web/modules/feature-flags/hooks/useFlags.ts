import type { AppFlags } from "@calcom/features/flags/config";
import { trpc } from "@calcom/trpc/react";

const initialData: AppFlags = {
  "calendar-cache": false,
  "calendar-cache-serve": false,
  emails: false,
  webhooks: false,
  "email-verification": false,
  "disable-signup": false,
  "organizer-request-email-v2": false,
  "delegation-credential": false,
  "salesforce-crm-tasker": false,
  "cal-video-log-in-overlay": false,
  "restriction-schedule": false,
  "calendar-subscription-cache": false,
  "calendar-subscription-sync": false,
  "onboarding-v3": false,
  "booker-botid": false,
  "booking-calendar-view": false,
  "booking-email-sms-tasker": false,
  "bookings-v3": false,
  "booking-audit": false,
  "hwm-seating": false,
  "signup-watchlist-review": false,
  "sink-shortener": false,
};

export function useFlags(): Partial<AppFlags> {
  const query = trpc.viewer.features.map.useQuery();
  return query.data ?? initialData;
}

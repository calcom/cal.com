import type { BookerEvent } from "@calcom/features/bookings/types";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

// Create a properly branded empty bookingFields array using the Zod schema
const brandedBookingFields: BookerEvent["bookingFields"] = eventTypeBookingFields
  .brand<"HAS_SYSTEM_FIELDS">()
  .parse([]);

export const mockEvent: BookerEvent = {
  id: 1,
  title: "Quick check-in",
  slug: "quick-check-in",
  description:
    "Use this event for a quick 15 minute catchup. Visit this long url to test the component https://cal.com/averylongurlwithoutspacesthatshouldntbreaklayout",
  schedulingType: null,
  length: 30,
  locations: [{ type: "integrations:google:meet" }, { type: "integrations:zoom" }],
  // Required properties from BookerEvent type
  interfaceLanguage: null,
  bookingFields: brandedBookingFields,
  lockTimeZoneToggleOnBookingPage: false,
  lockedTimeZone: null,
  recurringEvent: null,
  entity: {
    considerUnpublished: false,
    fromRedirectOfNonOrgLink: false,
    orgSlug: null,
    name: null,
    teamSlug: null,
    logoUrl: null,
    hideProfileLink: false,
  },
  metadata: null,
  isDynamic: false,
  requiresConfirmation: false,
  price: 0,
  currency: "USD",
  schedule: null,
  seatsPerTimeSlot: null,
  forwardParamsSuccessRedirect: false,
  successRedirectUrl: null,
  subsetOfHosts: [],
  seatsShowAvailabilityCount: false,
  isInstantEvent: false,
  instantMeetingParameters: [],
  fieldTranslations: [],
  autoTranslateDescriptionEnabled: false,
  disableCancelling: false,
  disableRescheduling: false,
  team: null,
  owner: null,
  subsetOfUsers: [],
  showInstantEventConnectNowModal: false,
  profile: {
    name: null,
    image: undefined,
    bookerLayouts: null,
  },
};

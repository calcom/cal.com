import { UserPermissionRole } from "@calcom/prisma/client";
import { IdentityProvider } from "@calcom/prisma/enums";

export const getSampleUserInSession = function () {
  return {
    locale: "",
    avatar: "",
    organization: {
      isOrgAdmin: false,
      metadata: null,
    },
    defaultScheduleId: null,
    name: "",
    defaultBookerLayouts: null,
    timeZone: "Asia/Kolkata",
    selectedCalendars: [],
    destinationCalendar: null,
    emailVerified: new Date(),
    allowDynamicBooking: false,
    bio: "",
    weekStart: "",
    startTime: 0,
    endTime: 0,
    bufferTime: 0,
    hideBranding: false,
    timeFormat: 12,
    twoFactorEnabled: false,
    identityProvider: IdentityProvider.CAL,
    brandColor: "#292929",
    darkBrandColor: "#fafafa",
    away: false,
    metadata: null,
    role: UserPermissionRole.USER,
    disableImpersonation: false,
    organizationId: null,
    theme: "",
    createdDate: new Date(),
    trialEndsAt: new Date(),
    completedOnboarding: false,
    allowSEOIndexing: false,
    receiveMonthlyDigestEmail: false,
  };
};

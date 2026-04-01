import { getClientSecretFromPayment } from "@calcom/features/ee/payments/pages/getClientSecretFromPayment";
import { getTranslation } from "@calcom/i18n/server";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import type { Prisma } from "@calcom/prisma/client";
import { paymentDataSelect } from "@calcom/prisma/selects/payment";
import { createNewUsersConnectToOrgIfExists } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

export type { CityTimezones } from "@calcom/features/cityTimezones/cityTimezonesHandler";
export { cityTimezonesHandler } from "@calcom/features/cityTimezones/cityTimezonesHandler";
export { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";
export {
  DEFAULT_WEBHOOK_VERSION,
  WebhookVersion,
} from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
export { ENABLE_ASYNC_TASKER, MINUTES_TO_BOOK } from "@calcom/lib/constants";
export { slugify } from "@calcom/lib/slugify";
export { slugifyLenient } from "@calcom/lib/slugify-lenient";
export {
  AttributeType,
  CreationSource,
  MembershipRole,
  PeriodType,
  SchedulingType,
  TimeUnit,
  WebhookTriggerEvents,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
export type { CalendarEvent, EventBusyDate } from "@calcom/types/Calendar";
export { TRPCError } from "@trpc/server";
export { createNewUsersConnectToOrgIfExists };

export { dynamicEvent } from "@calcom/features/eventtypes/lib/defaultEvents";
export { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
export { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
export {
  teamMetadataSchema,
  userMetadata,
} from "@calcom/prisma/zod-utils";

export { symmetricEncrypt, symmetricDecrypt };

export { getTranslation };

export type TeamQuery = Prisma.TeamGetPayload<{
  select: {
    id: true;
    credentials: {
      select: typeof import("@calcom/prisma/selects/credential").credentialForCalendarServiceSelect;
    };
    name: true;
    logoUrl: true;
    members: {
      select: {
        role: true;
      };
    };
  };
}>;

export { paymentDataSelect };
export { getClientSecretFromPayment };

export { sendLocationChangeEmailsAndSMS } from "@calcom/emails/email-manager";
export type { OrgMembershipLookup } from "@calcom/features/di/modules/OrgMembershipLookup";
export { StripeBillingService } from "@calcom/features/ee/billing/service/billingProvider/StripeBillingService";
export { TeamService } from "@calcom/features/ee/teams/services/teamService";
export { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
export { encryptServiceAccountKey } from "@calcom/lib/server/serviceAccountKey";
export { validateUrlForSSRFSync } from "@calcom/lib/ssrfProtection";
export type { TraceContext } from "@calcom/lib/tracing";
export { distributedTracing } from "@calcom/lib/tracing/factory";
export { createHandler as createApiKeyHandler } from "@calcom/trpc/server/routers/viewer/apiKeys/create.handler";
export type { GroupedAttribute } from "@calcom/trpc/server/routers/viewer/attributes/getByUserId.handler";
export { groupMembershipAttributes } from "@calcom/trpc/server/routers/viewer/attributes/getByUserId.handler";

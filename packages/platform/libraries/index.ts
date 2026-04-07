import { getClientSecretFromPayment } from "@calcom/features/ee/payments/pages/getClientSecretFromPayment";
import { sanitizePaymentDataForClient } from "@calcom/features/ee/payments/pages/sanitizePaymentDataForClient";
import { getTeamMemberEmailForResponseOrContactUsingUrlQuery } from "@calcom/features/ee/teams/lib/getTeamMemberEmailFromCrm";
import {
  sendVerificationCode,
  verifyPhoneNumber,
} from "@calcom/features/ee/workflows/lib/reminders/verifyPhoneNumber";
import { getRoutedUrl } from "@calcom/features/routing-forms/lib/getRoutedUrl";
import { getTranslation } from "@calcom/i18n/server";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import type { Prisma } from "@calcom/prisma/client";
import { paymentDataSelect } from "@calcom/prisma/selects/payment";
import { createNewUsersConnectToOrgIfExists } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

export {
  AttributeType,
  CreationSource,
  MembershipRole,
  WebhookTriggerEvents,
} from "@calcom/prisma/enums";

export {
  DEFAULT_WEBHOOK_VERSION,
  WebhookVersion,
} from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
export type { IWebhookProducerService } from "@calcom/features/webhooks/lib/interface/WebhookProducerService";
export { getWebhookProducer } from "@calcom/features/di/webhooks/containers/webhook";

export type { BookingResponse } from "@calcom/features/bookings/types";

export type { CityTimezones } from "@calcom/features/cityTimezones/cityTimezonesHandler";
export { cityTimezonesHandler } from "@calcom/features/cityTimezones/cityTimezonesHandler";

export { createNewUsersConnectToOrgIfExists };

export { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";

export { symmetricEncrypt, symmetricDecrypt };

export { getTranslation };

export { roundRobinManualReassignment } from "@calcom/features/ee/round-robin/roundRobinManualReassignment";
export { roundRobinReassignment } from "@calcom/features/ee/round-robin/roundRobinReassignment";

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
export { sanitizePaymentDataForClient };

export type { GroupedAttribute } from "@calcom/trpc/server/routers/viewer/attributes/getByUserId.handler";
export { groupMembershipAttributes } from "@calcom/trpc/server/routers/viewer/attributes/getByUserId.handler";

export { getRoutedUrl };

export { getTeamMemberEmailForResponseOrContactUsingUrlQuery };

export { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
export { findTeamMembersMatchingAttributeLogic } from "@calcom/features/routing-forms/lib/findTeamMembersMatchingAttributeLogic";
export { createHandler as createApiKeyHandler } from "@calcom/trpc/server/routers/viewer/apiKeys/create.handler";
export type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "@calcom/trpc/server/routers/viewer/attributes/findTeamMembersMatchingAttributeLogic.schema";

export { verifyPhoneNumber, sendVerificationCode };

export { verifyCodeUnAuthenticated } from "@calcom/features/auth/lib/verifyCodeUnAuthenticated";
export { sendEmailVerificationByCode } from "@calcom/features/auth/lib/verifyEmail";
export { CreditService } from "@calcom/features/ee/billing/credit-service";
export { getCheckoutSessionExpiresAt } from "@calcom/features/ee/billing/helpers/getCheckoutSessionExpiresAt";
export { StripeBillingService } from "@calcom/features/ee/billing/service/billingProvider/StripeBillingService";
export { TeamService } from "@calcom/features/ee/teams/services/teamService";
export { AppPushSubscriptionRepository } from "@calcom/features/notifications/app-push-subscription-repository";
export type {
  AppPushPlatform,
  RegisterAppPushSubscriptionInput,
  RemoveAppPushSubscriptionInput,
} from "@calcom/features/notifications/app-push-subscription-schema";
export {
  appPushPlatformSchema,
  registerAppPushSubscriptionSchema,
  removeAppPushSubscriptionSchema,
} from "@calcom/features/notifications/app-push-subscription-schema";
export { AppPushSubscriptionService } from "@calcom/features/notifications/app-push-subscription-service";
export { validateUrlForSSRFSync } from "@calcom/lib/ssrfProtection";
export { CreditUsageType } from "@calcom/prisma/enums";
export { checkEmailVerificationRequired } from "@calcom/trpc/server/routers/publicViewer/checkIfUserEmailVerificationRequired.handler";
export { verifyCode as verifyCodeAuthenticated } from "@calcom/trpc/server/routers/viewer/organizations/verifyCode.handler";

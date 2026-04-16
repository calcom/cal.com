import getEnabledAppsFromCredentials from "@calcom/app-store/_utils/getEnabledAppsFromCredentials";
import getApps, { type CredentialDataWithTeamName } from "@calcom/app-store/utils";
import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";

export type { TDependencyData } from "@calcom/app-store/_appRegistry";
export { BuildCalendarService } from "@calcom/app-store/applecalendar/lib";
export { BuildCalendarService as BuildIcsFeedCalendarService } from "@calcom/app-store/ics-feedcalendar/lib";
export type { CredentialOwner } from "@calcom/app-store/types";
export type { CredentialDataWithTeamName, LocationOption } from "@calcom/app-store/utils";
export { getAppFromSlug } from "@calcom/app-store/utils";

export { getApps };

export { handleDeleteCredential };

export type { App } from "@calcom/types/App";

export { getEnabledAppsFromCredentials };

export type { ConnectedApps } from "@calcom/app-store/_utils/getConnectedApps";
export { getConnectedApps } from "@calcom/app-store/_utils/getConnectedApps";
export { OAuth2UniversalSchema } from "@calcom/app-store/_utils/oauth/universalSchema";
export {
  CalendarAppDelegationCredentialClientIdNotAuthorizedError,
  CalendarAppDelegationCredentialConfigurationError,
  CalendarAppDelegationCredentialError,
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialNotSetupError,
  CalendarAppError,
} from "@calcom/lib/CalendarAppError";
export type { TServiceAccountKeySchema } from "@calcom/prisma/zod-utils";
export type { AppsStatus } from "@calcom/types/Calendar";
export type { CredentialPayload } from "@calcom/types/Credential";

// Delegation credentials removed (EE feature) — stub for API v2
export const DelegationCredentialRepository = {
  findByIdIncludeSensitiveServiceAccountKey(_args: {
    id: string;
  }): Promise<{ serviceAccountKey: { client_email: string; private_key: string } | null } | null> {
    return Promise.resolve(null);
  },
};

export { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";

// enrichUserWithDelegationConferencingCredentialsWithoutOrgId removed (EE feature) — stub for API v2
export async function enrichUserWithDelegationConferencingCredentialsWithoutOrgId(_args: {
  user: { credentials: unknown[]; [key: string]: unknown };
}): Promise<{ credentials: unknown[] }> {
  return { credentials: (_args.user.credentials as unknown[]) || [] };
}

import getEnabledAppsFromCredentials from "@calcom/app-store/_utils/getEnabledAppsFromCredentials";
import getApps from "@calcom/app-store/utils";
import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import addDelegationCredential from "@calcom/trpc/server/routers/viewer/delegationCredential/add.handler";

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
export type { TServiceAccountKeySchema } from "@calcom/prisma/zod-utils";
export type { AppsStatus } from "@calcom/types/Calendar";
export type { CredentialPayload } from "@calcom/types/Credential";

export { addDelegationCredential };

export { OAuth2UniversalSchema } from "@calcom/app-store/_utils/oauth/universalSchema";
export {
  enrichUserWithDelegationConferencingCredentialsWithoutOrgId,
  getUsersCredentialsIncludeServiceAccountKey,
} from "@calcom/app-store/delegationCredential";
export { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
export {
  CalendarAppDelegationCredentialClientIdNotAuthorizedError,
  CalendarAppDelegationCredentialConfigurationError,
  CalendarAppDelegationCredentialError,
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialNotSetupError,
  CalendarAppError,
} from "@calcom/lib/CalendarAppError";
export { toggleDelegationCredentialEnabled } from "@calcom/trpc/server/routers/viewer/delegationCredential/toggleEnabled.handler";

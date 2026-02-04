import { triggerDelegationCredentialErrorWebhook } from "@calcom/features/webhooks/lib/triggerDelegationCredentialErrorWebhook";
import {
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialConfigurationError,
} from "@calcom/lib/CalendarAppError";
import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";

import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import { oAuthManagerHelper } from "../../_utils/oauth/oAuthManagerHelper";
import metadata from "../_metadata";
import { getOfficeAppKeys } from "./getOfficeAppKeys";

const log = logger.getSubLogger({ prefix: ["app-store/office365calendar/lib/CalendarAuth"] });

export class CalendarAuth {
  private credential: CredentialForCalendarServiceWithTenantId;
  public authManager: OAuthManager;

  constructor(credential: CredentialForCalendarServiceWithTenantId) {
    this.credential = credential;
    this.authManager = new OAuthManager({
      credentialSyncVariables: {
        APP_CREDENTIAL_SHARING_ENABLED: APP_CREDENTIAL_SHARING_ENABLED,
        CREDENTIAL_SYNC_ENDPOINT: CREDENTIAL_SYNC_ENDPOINT,
        CREDENTIAL_SYNC_SECRET: CREDENTIAL_SYNC_SECRET,
        CREDENTIAL_SYNC_SECRET_HEADER_NAME: CREDENTIAL_SYNC_SECRET_HEADER_NAME,
      },
      resourceOwner: {
        type: "user",
        id: credential.userId,
      },
      appSlug: metadata.slug,
      currentTokenObject: getTokenObjectFromCredential(credential),
      fetchNewTokenObject: async ({ refreshToken }: { refreshToken: string | null }) => {
        const isDelegated = Boolean(credential?.delegatedTo);

        if (!isDelegated && !refreshToken) {
          return null;
        }

        const { client_id, client_secret } = await this.getAuthCredentials(isDelegated);
        const url = await this.getAuthUrl(isDelegated, credential?.delegatedTo?.serviceAccountKey?.tenant_id);

        const bodyParams = {
          scope: isDelegated
            ? "https://graph.microsoft.com/.default"
            : "User.Read Calendars.Read Calendars.ReadWrite",
          client_id,
          client_secret,
          grant_type: isDelegated ? "client_credentials" : "refresh_token",
          ...(isDelegated ? {} : { refresh_token: refreshToken ?? "" }),
        };

        return fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(bodyParams),
        });
      },
      isTokenObjectUnusable: async function () {
        return null;
      },
      isAccessTokenUnusable: async function () {
        return null;
      },
      invalidateTokenObject: () => oAuthManagerHelper.invalidateCredential(credential.id),
      expireAccessToken: () => oAuthManagerHelper.markTokenAsExpired(credential),
      updateTokenObject: (tokenObject) => {
        if (!credential.delegatedTo) {
          return oAuthManagerHelper.updateTokenObject({ tokenObject, credentialId: credential.id });
        }
        return Promise.resolve();
      },
    });
  }

  private async getAuthUrl(delegatedTo: boolean, tenantId?: string): Promise<string> {
    if (delegatedTo) {
      if (!tenantId) {
        const error = new CalendarAppDelegationCredentialInvalidGrantError(
          "Invalid DelegationCredential Settings: tenantId is missing"
        );
        await this.triggerDelegationCredentialError(error);
        throw error;
      }
      return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    }
    return "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  }

  private async getAuthCredentials(isDelegated: boolean) {
    if (isDelegated) {
      const client_id = this.credential?.delegatedTo?.serviceAccountKey?.client_id;
      const client_secret = this.credential?.delegatedTo?.serviceAccountKey?.private_key;

      if (!client_id || !client_secret) {
        const error = new CalendarAppDelegationCredentialConfigurationError(
          "Delegation credential without clientId or Secret"
        );
        await this.triggerDelegationCredentialError(error);
        throw error;
      }

      return { client_id, client_secret };
    }
    return getOfficeAppKeys();
  }

  private async triggerDelegationCredentialError(error: Error): Promise<void> {
    if (
      this.credential.userId &&
      this.credential.user &&
      this.credential.appId &&
      this.credential.delegatedToId
    ) {
      await triggerDelegationCredentialErrorWebhook({
        error,
        credential: {
          id: this.credential.id,
          type: this.credential.type,
          appId: this.credential.appId,
        },
        user: {
          id: this.credential.userId,
          email: this.credential.user.email,
        },
        delegationCredentialId: this.credential.delegatedToId,
      });
    }
  }

  public async getAccessToken(): Promise<string> {
    const { token } = await this.authManager.getTokenObjectOrFetch();
    if (!token || typeof token !== "object" || !("access_token" in token)) {
      throw new Error("Failed to get access token");
    }
    return token.access_token as string;
  }
}

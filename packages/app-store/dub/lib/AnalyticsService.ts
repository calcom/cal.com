import { Dub } from "dub-package";

import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import logger from "@calcom/lib/logger";
import type { AnalyticsService, SendEventProps } from "@calcom/types/AnalyticsService";
import type { CredentialPayload } from "@calcom/types/Credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import type { DubOAuthToken } from "./type";

class DubService implements AnalyticsService {
  private dubClient?: Dub;
  private client_id = "";
  private client_secret = "";
  private log = logger.getSubLogger({ prefix: ["[[lib]] dub"] });
  private credential: CredentialPayload;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.client_id = "";
    this.client_secret = "";
  }

  private async initClient() {
    const appKeys = await getAppKeysFromSlug("dub");

    const { client_id, client_secret } = appKeys;

    if (!client_id || !client_secret) {
      this.log.error("Dub.co app keys missing!");
      return;
    }

    this.client_id = client_id as string;
    this.client_secret = client_secret as string;

    let token = this.credential.key as unknown as DubOAuthToken | undefined;

    if (!token) return;

    const isTokenExpired = (token: DubOAuthToken) => {
      if (!token || !token.access_token) return true;
      if (token.expiry_date) {
        return token.expiry_date < Date.now();
      }

      return false;
    };

    if (isTokenExpired(token)) {
      token = await this.refreshAccessToken(token.refresh_token);
      if (!token) return;
    }

    this.dubClient = new Dub({ token: token.access_token });
  }

  private async refreshAccessToken(refreshToken: string): Promise<DubOAuthToken | undefined> {
    try {
      if (!refreshToken) return;
      const newToken: DubOAuthToken = await refreshOAuthTokens(
        async () => {
          const response = await fetch(`https://api.dub.co/oauth/token`, {
            method: "POST",
            body: new URLSearchParams({
              client_id: this.client_id,
              client_secret: this.client_secret,
              grant_type: "refresh_token",
              refresh_token: refreshToken,
            }).toString(),
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });

          if (!response.ok) {
            const res = await response.json();
            if (response.status === 401) {
              await CredentialRepository.updateCredentialById({
                id: this.credential.id,
                data: {
                  invalid: true,
                },
              });
            }
            throw new Error(`Error refreshing dub token: ${res?.error?.message ?? response.statusText}`);
          }
          return await response.json();
        },
        "dub",
        this.credential.userId
      );

      newToken.expiry_date = Date.now() + newToken.expires_in * 1000;

      await CredentialRepository.updateCredentialById({
        id: this.credential.id,
        data: { key: newToken as any },
      });

      return newToken;
    } catch (err) {
      this.log.error(err);
      throw err;
    }
  }

  async sendEvent({ name, email, eventName, id, externalId }: SendEventProps): Promise<void> {
    await this.initClient();

    if (!this.dubClient) return;

    await this.dubClient.track.lead({
      clickId: id,
      customerName: name,
      customerEmail: email,
      externalId: externalId ?? email,
      eventName: eventName ?? "Cal.com lead",
    });
  }
}

/**
 * Factory function that creates a Dub Analytics service instance.
 * This is exported instead of the class to prevent SDK types (Dub)
 * from leaking into the emitted .d.ts file.
 */
export default function BuildAnalyticsService(credential: CredentialPayload): AnalyticsService {
  return new DubService(credential);
}

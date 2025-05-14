import { Dub } from "dub";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { DUB, TrackLead } from "@calcom/types/DubService";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import type { DubOAuthToken } from "./type";

export default class DubService implements DUB {
  private dubClient?: Dub;
  private client_id = "";
  private client_secret = "";
  private log = logger.getSubLogger({ prefix: ["[[lib]] dubco"] });
  private credential: CredentialPayload;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.client_id = "";
    this.client_secret = "";
  }

  private async initClient() {
    const appKeys = await getAppKeysFromSlug("dubco");

    const { client_id, client_secret } = appKeys;

    if (!client_id && !client_secret) {
      this.log.error("Dub.co app keys missing!");
      return;
    }

    let token = this.credential.key as unknown as DubOAuthToken;

    const isTokenExpired = (token: DubOAuthToken) =>
      !token || !token.access_token || (token.expiry_date && token.expiry_date < Date.now());

    if (isTokenExpired(token)) {
      token = await this.refreshAccessToken(token.refresh_token);
    }

    this.dubClient = new Dub({ token: token.access_token });
  }

  private async refreshAccessToken(refreshToken: string): Promise<DubOAuthToken> {
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
        return await response.json();
      },
      "dubco",
      this.credential.userId
    );

    newToken.expiry_date = Date.now() + newToken.expires_in * 1000;

    await prisma.credential.update({
      where: { id: this.credential.id },
      data: { key: newToken as any },
    });

    return newToken;
  }

  async trackLead({ clickId, email, name, eventName, externalId }: TrackLead): Promise<void> {
    if (!this.dubClient) {
      await this.initClient();
    }

    if (!this.dubClient) return;

    await this.dubClient.track.lead({
      clickId,
      customerName: name,
      customerEmail: email,
      externalId: externalId ?? email,
      eventName: eventName ?? "Cal.com lead",
    });
  }
}

import { AppsRepository } from "@/modules/apps/apps.repository";
import { OAuthCallbackState } from "@/modules/conferencing/controllers/conferencing.controller";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

import { OFFICE_365_VIDEO, OFFICE_365_VIDEO_TYPE } from "@calcom/platform-constants";
import type { Prisma } from "@calcom/prisma/client";

import stringify = require("qs-stringify");

const zoomAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

@Injectable()
export class Office365VideoService {
  private logger = new Logger("Office365VideoService");
  private redirectUri = `${this.config.get("api.url")}/conferencing/${OFFICE_365_VIDEO}/oauth/callback`;
  private scopes = ["OnlineMeetings.ReadWrite", "offline_access"];

  constructor(
    private readonly config: ConfigService,
    private readonly appsRepository: AppsRepository,
    private readonly credentialsRepository: CredentialsRepository
  ) {}

  async getOffice365AppKeys() {
    const app = await this.appsRepository.getAppBySlug(OFFICE_365_VIDEO);

    const { client_id, client_secret } = zoomAppKeysSchema.parse(app?.keys);

    if (!client_id) {
      throw new NotFoundException("Office365 app not found");
    }

    if (!client_secret) {
      throw new NotFoundException("Office365 app not found");
    }

    return { client_id, client_secret };
  }

  async generateOffice365AuthUrl(state: string) {
    const { client_id } = await this.getOffice365AppKeys();

    const params = {
      response_type: "code",
      client_id,
      scope: this.scopes.join(" "),
      redirect_uri: this.redirectUri,
      state: state,
    };

    const query = stringify(params);

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`;
    return { url };
  }

  async connectOffice365App(state: OAuthCallbackState, code: string, userId: number, teamId?: number) {
    const { client_id, client_secret } = await this.getOffice365AppKeys();

    const toUrlEncoded = (payload: Record<string, string>) =>
      Object.keys(payload)
        .map((key) => `${key}=${encodeURIComponent(payload[key])}`)
        .join("&");

    const body = toUrlEncoded({
      client_id,
      grant_type: "authorization_code",
      code,
      scope: this.scopes.join(" "),
      redirect_uri: this.redirectUri,
      client_secret,
    });

    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
    });

    const responseBody = await response.json();

    if (!response.ok) {
      throw new BadRequestException(responseBody.error);
    }

    const whoami = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${responseBody.access_token}` },
    });

    const graphUser = await whoami.json();

    // In some cases, graphUser.mail is null. Then graphUser.userPrincipalName most likely contains the email address.
    responseBody.email = graphUser.mail ?? graphUser.userPrincipalName;
    responseBody.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in); // set expiry date in seconds
    delete responseBody.expires_in;

    const existingCredentialOffice365Video = teamId
      ? await this.credentialsRepository.findAllCredentialsByTypeAndTeamId(OFFICE_365_VIDEO_TYPE, teamId)
      : await this.credentialsRepository.findAllCredentialsByTypeAndUserId(OFFICE_365_VIDEO_TYPE, userId);

    const credentialIdsToDelete = existingCredentialOffice365Video.map((item) => item.id);
    if (credentialIdsToDelete.length > 0) {
      teamId
        ? await this.appsRepository.deleteTeamAppCredentials(credentialIdsToDelete, teamId)
        : await this.appsRepository.deleteAppCredentials(credentialIdsToDelete, userId);
    }

    teamId
      ? await this.appsRepository.createTeamAppCredential(
          OFFICE_365_VIDEO_TYPE,
          responseBody as unknown as Prisma.InputJsonObject,
          teamId,
          OFFICE_365_VIDEO
        )
      : await this.appsRepository.createAppCredential(
          OFFICE_365_VIDEO_TYPE,
          responseBody as unknown as Prisma.InputJsonObject,
          userId,
          OFFICE_365_VIDEO
        );

    return { url: state.returnTo ?? "" };
  }
}

import { CalAppRepository } from "@/modules/cal-app/app.repository";
import { CredentialRepository } from "@/modules/credential/credential.repository";
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Redirect,
} from "@nestjs/common";
import { google } from "googleapis";

import { ApiRedirectResponseType } from "@calcom/platform-types";

@Controller({
  path: "gcal",
  version: "2",
})
export class GoogleCalendarController {
  private readonly logger = new Logger("OAuthClientController");

  constructor(
    private readonly appRepository: CalAppRepository,
    private readonly credentialRepository: CredentialRepository
  ) {}

  @Get("/oauth")
  @Redirect(undefined, 301)
  @HttpCode(HttpStatus.OK)
  async oAuth(): Promise<ApiRedirectResponseType> {
    const scopes = [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ];
    const app = await this.appRepository.getAppBySlug("google-calendar");
    if (!app) {
      throw new NotFoundException();
    }
    const keys = app.keys as { client_id?: string; client_secret?: string };
    if (!keys.client_id) throw new BadRequestException("Missing google calendar client_id");
    if (!keys.client_secret) throw new BadRequestException("Missing google calendar secret");
    const redirect_uri = `localhost:3000/api/v2/gcal/save`;
    const oAuth2Client = new google.auth.OAuth2(keys.client_id, keys.client_secret, redirect_uri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      // always generate refresh token
      prompt: "consent",
      //state: encodeOAuthState(req),
    });

    return { url: authUrl };
  }

  @Get("/save")
  @Redirect(undefined, 301)
  @HttpCode(HttpStatus.OK)
  async save(): Promise<ApiRedirectResponseType> {
    return { url: "/customer-platform" };
  }
}

import { AppsRepository } from "@/modules/apps/apps.repository";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { google } from "googleapis";
import { z } from "zod";

@Injectable()
export class GcalService {
  private logger = new Logger("GcalService");

  constructor(private readonly appsRepository: AppsRepository) {}

  async getOAuthClient(redirectUri: string) {
    this.logger.log("Getting Google Calendar OAuth Client");
    const app = await this.appsRepository.getAppBySlug("google-calendar");

    if (!app) {
      throw new NotFoundException();
    }

    const { client_id, client_secret } = z
      .object({ client_id: z.string(), client_secret: z.string() })
      .parse(app.keys);

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);
    return oAuth2Client;
  }
}

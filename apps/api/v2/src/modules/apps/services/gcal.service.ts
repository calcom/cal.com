import { AppsRepository } from "@/modules/apps/apps.repository";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OAuth2Client } from "googleapis-common";
import { z } from "zod";

@Injectable()
export class GCalService {
  private logger = new Logger("GcalService");

  private gcalResponseSchema = z.object({ client_id: z.string(), client_secret: z.string() });

  constructor(private readonly appsRepository: AppsRepository) {}

  async getOAuthClient(redirectUri: string) {
    this.logger.log("Getting Google Calendar OAuth Client");
    const app = await this.appsRepository.getAppBySlug("google-calendar");

    if (!app) {
      throw new NotFoundException();
    }

    const { client_id, client_secret } = this.gcalResponseSchema.parse(app.keys);

    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirectUri);
    return oAuth2Client;
  }
}

import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { Request } from "express";

import { CreateBookingInput_2024_08_13, RescheduleBookingInput_2024_08_13 } from "@calcom/platform-types";

const DEFAULT_PLATFORM_PARAMS = {
  platformClientId: "",
  platformCancelUrl: "",
  platformRescheduleUrl: "",
  platformBookingUrl: "",
  arePlatformEmailsEnabled: false,
  platformBookingLocation: undefined,
};

@Injectable()
export class InputBookingsService_2024_08_13 {
  private readonly logger = new Logger("InputBookingsService_2024_08_13");

  constructor(
    private readonly oAuthFlowService: OAuthFlowService,
    private readonly oAuthClientRepository: OAuthClientRepository
  ) {}
  private async createBookingRequest(req: Request, oAuthClientId?: string, locationUrl?: string) {
    const reqCopy = { ...req };
    const userId = (await this.createBookingRequestOwnerId(req)) ?? -1;
    const oAuthParams = oAuthClientId
      ? await this.createBookingRequestOAuthClientParams(oAuthClientId)
      : DEFAULT_PLATFORM_PARAMS;
    Object.assign(reqCopy, { userId, ...oAuthParams, platformBookingLocation: locationUrl });
    reqCopy.body = { ...reqCopy.body, noEmail: !oAuthParams.arePlatformEmailsEnabled };

    return reqCopy;
  }

  private async createBookingRequestOwnerId(req: Request): Promise<number | undefined> {
    try {
      const accessToken = req.get("Authorization")?.replace("Bearer ", "");
      if (accessToken) {
        return this.oAuthFlowService.getOwnerId(accessToken);
      }
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async createBookingRequestOAuthClientParams(clientId: string) {
    const params = DEFAULT_PLATFORM_PARAMS;
    try {
      const client = await this.oAuthClientRepository.getOAuthClient(clientId);
      if (client) {
        params.platformClientId = clientId;
        params.platformCancelUrl = client.bookingCancelRedirectUri ?? "";
        params.platformRescheduleUrl = client.bookingRescheduleRedirectUri ?? "";
        params.platformBookingUrl = client.bookingRedirectUri ?? "";
        params.arePlatformEmailsEnabled = client.areEmailsEnabled ?? false;
      }
      return params;
    } catch (err) {
      this.logger.error(err);
      return params;
    }
  }

  transformInputCreateBooking(
    inputBooking: CreateBookingInput_2024_08_13 | RescheduleBookingInput_2024_08_13
  ) {
    return inputBooking;
  }
}

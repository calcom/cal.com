import { Injectable, Logger } from "@nestjs/common";
import { AccessToken } from "@prisma/client";

@Injectable()
export class OAuthFlowService {
  private logger = new Logger("OAuthFlowService");

  async propagateAccessToken(accessToken: AccessToken) {
    this.logger.log("Propagating access token to redis", accessToken.secret);
    // TODO propagate
    return void 0;
  }
}

import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";

type OAuthTokenPayload = {
  userId?: number;
  teamId?: number;
  scope: string[];
  token_type: string;
};

@Injectable()
export class TokensService {
  private readonly logger = new Logger("TokensService");

  constructor(private readonly config: ConfigService) {}

  getDecodedThirdPartyAccessToken(token: string): OAuthTokenPayload | null {
    const encryptionKey = this.config.get<string>("CALENDSO_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new InternalServerErrorException("CALENDSO_ENCRYPTION_KEY environment variable is not set.");
    }

    let decodedToken: OAuthTokenPayload;
    try {
      decodedToken = jwt.verify(token, encryptionKey) as OAuthTokenPayload;
    } catch (e) {
      return null;
    }

    if (!decodedToken || decodedToken.token_type !== "Access Token") {
      return null;
    }

    return decodedToken;
  }
}

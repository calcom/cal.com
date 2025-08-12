import { Injectable } from "@nestjs/common";
import { JwtService as NestJwtService } from "@nestjs/jwt";

@Injectable()
export class JwtService {
  constructor(private readonly nestJwtService: NestJwtService) {}

  signAccessToken(payload: Payload) {
    const accessToken = this.sign({ type: "access_token", ...payload });
    return accessToken;
  }

  signRefreshToken(payload: Payload) {
    const refreshToken = this.sign({ type: "refresh_token", ...payload });
    return refreshToken;
  }

  sign(payload: Payload) {
    const issuedAtTime = this.getIssuedAtTime();

    const token = this.nestJwtService.sign({ ...payload, iat: issuedAtTime });
    return token;
  }

  getIssuedAtTime() {
    // divided by 1000 because iat (issued at time) is in seconds (not milliseconds) as informed by JWT specification
    return Math.floor(Date.now() / 1000);
  }

  decode(token: string): Payload {
    return this.nestJwtService.decode(token) as Payload;
  }
}

type Payload = Record<string | number | symbol, any>;

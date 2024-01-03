import { Injectable } from "@nestjs/common";
import { JwtService as NestJwtService } from "@nestjs/jwt";

@Injectable()
export class JwtService {
  constructor(private readonly nestJwtService: NestJwtService) {}

  sign(payload: Record<any, any>) {
    const issuedAtTime = this.getIssuedAtTime();

    const token = this.nestJwtService.sign(JSON.stringify({ ...payload, iat: issuedAtTime }));

    return token;
  }

  signAccessToken(payload: Record<any, any>) {
    const issuedAtTime = this.getIssuedAtTime();

    const accessToken = this.nestJwtService.sign(
      JSON.stringify({ type: "access_token", ...payload, iat: issuedAtTime })
    );

    return accessToken;
  }

  signRefreshToken(payload: Record<any, any>) {
    const issuedAtTime = this.getIssuedAtTime();

    const accessToken = this.nestJwtService.sign(
      JSON.stringify({ type: "refresh_token", ...payload, iat: issuedAtTime })
    );

    return accessToken;
  }

  getIssuedAtTime() {
    // divided by 1000 because iat (issued at time) is in seconds (not milliseconds) as informed by JWT speficication
    return Math.floor(Date.now() / 1000);
  }
}

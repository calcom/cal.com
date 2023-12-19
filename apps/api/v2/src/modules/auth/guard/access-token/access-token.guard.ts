import { Injectable, CanActivate, ExecutionContext, Global, UnauthorizedException } from "@nestjs/common";

@Global()
@Injectable()
export class AccessTokenGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const accessToken = request.get("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      throw new UnauthorizedException();
    }

    const valid = this.validateAccessToken(accessToken);

    if (!valid) {
      throw new UnauthorizedException();
    }

    return true;
  }

  validateAccessToken(token: string) {
    if (token === "accessToken") {
      return true;
    }

    return false;
  }
}

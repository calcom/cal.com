import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly prismaReadService: PrismaReadService) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    const bearer = authHeader.replace("Bearer ", "").trim();
    if (!bearer) {
      throw new UnauthorizedException();
    }

    return this.validateToken(bearer);
  }

  async validateToken(accessToken: string) {
    // TODO: read from redis once there, fall back to prisma if not found.
    const token = await this.prismaReadService.prisma.accessToken.findFirst({
      where: {
        secret: accessToken,
      },
    });

    if (!token) {
      throw new UnauthorizedException();
    }

    if (new Date() > token.expiresAt) {
      throw new UnauthorizedException("Token is no longer valid.");
    }

    return true;
  }
}

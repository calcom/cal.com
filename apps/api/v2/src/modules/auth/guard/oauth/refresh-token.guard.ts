import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class RefreshTokenGuard implements CanActivate {
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
    const token = await this.prismaReadService.prisma.refreshToken.findFirst({
      where: {
        secret: accessToken,
      },
    });

    if (!token) {
      throw new UnauthorizedException();
    }

    if (new Date() > token.expiresAt) {
      throw new UnauthorizedException("Refresh Token is no longer valid.");
    }

    return true;
  }
}

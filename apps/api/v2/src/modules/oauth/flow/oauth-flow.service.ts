import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AccessToken } from "@prisma/client";

@Injectable()
export class OAuthFlowService {
  private logger = new Logger("OAuthFlowService");

  constructor(private readonly prismaReadService: PrismaReadService) {}

  async propagateAccessToken(accessToken: AccessToken) {
    this.logger.log("Propagating access token to redis", accessToken.secret);
    // TODO propagate
    return void 0;
  }

  async validateAccessToken(secret: string) {
    // status can be "CACHE_HIT" or "CACHE_MISS", MISS will most likely mean the token has expired
    // but we need to check the SQL db for it anyways.
    const { status } = await this.readFromCache(secret);

    if (status === "CACHE_HIT") {
      return true;
    }

    const token = await this.prismaReadService.prisma.accessToken.findFirst({
      where: {
        secret,
      },
      select: {
        expiresAt: true,
      },
    });

    if (!token) {
      throw new UnauthorizedException();
    }

    if (new Date() > token?.expiresAt) {
      throw new BadRequestException("Token is expired");
    }

    return true;
  }

  private async readFromCache(secret: string) {
    return { status: "CACHE_MISS" };
  }
}

import * as crypto from "node:crypto";
import { TestingModule } from "@nestjs/testing";
import { DateTime } from "luxon";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class TokensRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async createTokens(userId: number, clientId: string) {
    const accessExpiry = DateTime.now().plus({ days: 1 }).startOf("day").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();
    const accessTokenBuffer = crypto.randomBytes(48);
    const accessTokenSecret = accessTokenBuffer.toString("hex");
    const refreshTokenBuffer = crypto.randomBytes(48);
    const refreshTokenSecret = refreshTokenBuffer.toString("hex");
    const [accessToken, refreshToken] = await this.prismaWriteClient.$transaction([
      this.prismaWriteClient.accessToken.create({
        data: {
          secret: accessTokenSecret,
          expiresAt: accessExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: userId } },
        },
      }),
      this.prismaWriteClient.refreshToken.create({
        data: {
          secret: refreshTokenSecret,
          expiresAt: refreshExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: userId } },
        },
      }),
    ]);

    return {
      accessToken: accessToken.secret,
      refreshToken: refreshToken.secret,
    };
  }
}

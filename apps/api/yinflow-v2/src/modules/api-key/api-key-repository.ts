import { Injectable } from "@nestjs/common";

@Injectable()
export class ApiKeyRepository {
  // TODO: PrismaReadService
  async getApiKeyFromHash(hashedKey: string) {
    // return this.dbRead.prisma.apiKey.findUnique({
    //   where: {
    //     hashedKey,
    //   },
    // });
  }
}

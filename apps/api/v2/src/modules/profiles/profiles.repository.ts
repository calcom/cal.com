import { Injectable } from "@nestjs/common";

@Injectable()
export class ProfilesRepository {
  // TODO: PrismaReadService
  async getPlatformOwnerUserId(organizationId: number) {
    // const profile = await this.dbRead.prisma.profile.findFirst({
    //   where: {
    //     organizationId,
    //   },
    //   orderBy: {
    //     createdAt: "asc",
    //   },
    // });
    // return profile?.userId;
  }
}

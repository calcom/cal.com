import { MembershipRole } from "@calcom/platform-libraries";
import type { Membership, Prisma, Team, User } from "@calcom/prisma/client";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class MembershipRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(data: Prisma.MembershipCreateInput) {
    return this.prismaWriteClient.membership.create({ data: { createdAt: new Date(), ...data } });
  }

  async delete(membershipId: Membership["id"]) {
    return this.prismaWriteClient.membership.delete({ where: { id: membershipId } });
  }

  async get(membershipId: Membership["id"]) {
    return this.prismaReadClient.membership.findFirst({ where: { id: membershipId } });
  }

  async getUserMembershipByTeamId(userId: User["id"], teamId: Team["id"]) {
    return this.prismaReadClient.membership.findFirst({ where: { teamId, userId } });
  }

  async addUserToOrg(user: User, org: Team, role: MembershipRole, accepted: boolean) {
    const membership = await this.prismaWriteClient.membership.create({
      data: { createdAt: new Date(), teamId: org.id, userId: user.id, role, accepted },
    });
    await this.prismaWriteClient.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
    return membership;
  }

  async findById(membershipId: Membership["id"]) {
    return this.prismaReadClient.membership.findUnique({ where: { id: membershipId } });
  }
}

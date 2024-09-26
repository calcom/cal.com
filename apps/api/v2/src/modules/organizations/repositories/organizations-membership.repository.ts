import { Injectable } from "@nestjs/common";

import { CreateOrgMembershipDto } from "../inputs/create-organization-membership.input";
import { UpdateOrgMembershipDto } from "../inputs/update-organization-membership.input";

@Injectable()
export class OrganizationsMembershipRepository {
  // TODO: PrismaReadService
  async findOrgMembership(organizationId: number, membershipId: number) {
    // return this.dbRead.prisma.membership.findUnique({
    //   where: {
    //     id: membershipId,
    //     teamId: organizationId,
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async deleteOrgMembership(organizationId: number, membershipId: number) {
    // return this.dbWrite.prisma.membership.delete({
    //   where: {
    //     id: membershipId,
    //     teamId: organizationId,
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async createOrgMembership(organizationId: number, data: CreateOrgMembershipDto) {
    // return this.dbWrite.prisma.membership.create({
    //   data: { ...data, teamId: organizationId },
    // });
  }
  // TODO: PrismaWriteService
  async updateOrgMembership(organizationId: number, membershipId: number, data: UpdateOrgMembershipDto) {
    // return this.dbWrite.prisma.membership.update({
    //   data: { ...data },
    //   where: { id: membershipId, teamId: organizationId },
    // });
  }
  // TODO: PrismaReadService
  async findOrgMembershipsPaginated(organizationId: number, skip: number, take: number) {
    // return this.dbRead.prisma.membership.findMany({
    //   where: {
    //     teamId: organizationId,
    //   },
    //   skip,
    //   take,
    // });
  }
}

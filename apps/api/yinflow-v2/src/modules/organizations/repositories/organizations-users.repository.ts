import { Injectable } from "@nestjs/common";

import { CreateOrganizationUserInput } from "../inputs/create-organization-user.input";
import { UpdateOrganizationUserInput } from "../inputs/update-organization-user.input";

@Injectable()
export class OrganizationsUsersRepository {
  private filterOnOrgMembership(orgId: number) {
    return {
      profiles: {
        some: {
          organizationId: orgId,
        },
      },
    };
  }
  // TODO: PrismaReadService
  async getOrganizationUsersByEmails(orgId: number, emailArray?: string[], skip?: number, take?: number) {
    // return await this.dbRead.prisma.user.findMany({
    //   where: {
    //     ...this.filterOnOrgMembership(orgId),
    //     ...(emailArray && emailArray.length ? { email: { in: emailArray } } : {}),
    //   },
    //   skip,
    //   take,
    // });
  }
  // TODO: PrismaReadService
  async getOrganizationUserByUsername(orgId: number, username: string) {
    // return await this.dbRead.prisma.user.findFirst({
    //   where: {
    //     username,
    //     ...this.filterOnOrgMembership(orgId),
    //   },
    // });
  }
  // TODO: PrismaReadService
  async getOrganizationUserByEmail(orgId: number, email: string) {
    // return await this.dbRead.prisma.user.findFirst({
    //   where: {
    //     email,
    //     ...this.filterOnOrgMembership(orgId),
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async createOrganizationUser(orgId: number, createUserBody: CreateOrganizationUserInput) {
    // const createdUser = await this.dbWrite.prisma.user.create({
    //   data: createUserBody,
    // });
    // return createdUser;
  }
  // TODO: PrismaWriteService
  async updateOrganizationUser(orgId: number, userId: number, updateUserBody: UpdateOrganizationUserInput) {
    // return await this.dbWrite.prisma.user.update({
    //   where: {
    //     id: userId,
    //     organizationId: orgId,
    //   },
    //   data: updateUserBody,
    // });
  }
  // TODO: PrismaWriteService
  async deleteUser(orgId: number, userId: number) {
    // return await this.dbWrite.prisma.user.delete({
    //   where: {
    //     id: userId,
    //     organizationId: orgId,
    //   },
    // });
  }
}

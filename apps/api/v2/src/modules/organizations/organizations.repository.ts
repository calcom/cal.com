import { Injectable } from "@nestjs/common";

import { PlatformPlan } from "../billing/types";
import { StripeService } from "../stripe/stripe.service";

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly stripeService: StripeService) {}
  // TODO: PrismaReadService
  async findById(organizationId: number) {
    // return this.dbRead.prisma.team.findUnique({
    //   where: {
    //     id: organizationId,
    //     isOrganization: true,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async findByIdIncludeBilling(orgId: number) {
    // return this.dbRead.prisma.team.findUnique({
    //   where: {
    //     id: orgId,
    //   },
    //   include: {
    //     platformBilling: true,
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async createNewBillingRelation(orgId: number, plan?: PlatformPlan) {
    // const { id } = await this.stripeService.stripe.customers.create({
    //   metadata: {
    //     createdBy: "oauth_client_no_csid", // mark in case this is needed in the future.
    //   },
    // });
    // await this.dbWrite.prisma.team.update({
    //   where: {
    //     id: orgId,
    //   },
    //   data: {
    //     platformBilling: {
    //       create: {
    //         customerId: id,
    //         plan: plan ? plan.toString() : "none",
    //       },
    //     },
    //   },
    // });
    // return id;
  }
  // TODO: PrismaReadService
  async findTeamIdFromClientId(clientId: string) {
    // return this.dbRead.prisma.team.findFirstOrThrow({
    //   where: {
    //     platformOAuthClient: {
    //       some: {
    //         id: clientId,
    //       },
    //     },
    //   },
    //   select: {
    //     id: true,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async findPlatformOrgFromUserId(userId: number) {
    // return this.dbRead.prisma.team.findFirstOrThrow({
    //   where: {
    //     orgProfiles: {
    //       some: {
    //         userId: userId,
    //       },
    //     },
    //     isPlatform: true,
    //     isOrganization: true,
    //   },
    //   select: {
    //     id: true,
    //     isPlatform: true,
    //     isOrganization: true,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async findOrgUser(organizationId: number, userId: number) {
    // return this.dbRead.prisma.user.findUnique({
    //   where: {
    //     id: userId,
    //     profiles: {
    //       some: {
    //         organizationId,
    //       },
    //     },
    //   },
    // });
  }
  // TODO: PrismaReadService
  async fetchOrgAdminApiStatus(organizationId: number) {
    // return this.dbRead.prisma.organizationSettings.findUnique({
    //   where: {
    //     organizationId,
    //   },
    //   select: {
    //     isAdminAPIEnabled: true,
    //   },
    // });
  }
}

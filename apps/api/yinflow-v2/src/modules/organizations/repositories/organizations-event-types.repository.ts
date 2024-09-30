import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsEventTypesRepository {
  // TODO: PrismaReadService
  async getTeamEventType(teamId: number, eventTypeId: number) {
    // return this.dbRead.prisma.eventType.findUnique({
    //   where: {
    //     id: eventTypeId,
    //     teamId,
    //   },
    //   include: { users: true, schedule: true, hosts: true },
    // });
  }
  // TODO: PrismaReadService
  async getTeamEventTypeBySlug(teamId: number, eventTypeSlug: string) {
    // return this.dbRead.prisma.eventType.findUnique({
    //   where: {
    //     teamId_slug: {
    //       teamId,
    //       slug: eventTypeSlug,
    //     },
    //   },
    //   include: { users: true, schedule: true, hosts: true },
    // });
  }
  // TODO: PrismaReadService
  async getTeamEventTypes(teamId: number) {
    // return this.dbRead.prisma.eventType.findMany({
    //   where: {
    //     teamId,
    //   },
    //   include: { users: true, schedule: true, hosts: true },
    // });
  }
  // TODO: PrismaReadService
  async getEventTypeById(eventTypeId: number) {
    // return this.dbRead.prisma.eventType.findUnique({
    //   where: { id: eventTypeId },
    //   include: { users: true, schedule: true, hosts: true },
    // });
  }
  // TODO: PrismaReadService
  async getEventTypeChildren(eventTypeId: number) {
    // return this.dbRead.prisma.eventType.findMany({
    //   where: { parentId: eventTypeId },
    //   include: { users: true, schedule: true, hosts: true },
    // });
  }
  // TODO: PrismaReadService
  async getTeamsEventTypes(orgId: number, skip: number, take: number) {
    // return this.dbRead.prisma.eventType.findMany({
    //   where: {
    //     team: {
    //       parentId: orgId,
    //     },
    //   },
    //   skip,
    //   take,
    //   include: { users: true, schedule: true, hosts: true },
    // });
  }
  // TODO: PrismaReadService
  async getEventTypeByIdWithChildren(eventTypeId: number) {
    // return this.dbRead.prisma.eventType.findUnique({
    //   where: { id: eventTypeId },
    //   include: { children: true },
    // });
  }
}

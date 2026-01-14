import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SchedulingType } from "@calcom/prisma/enums";
import type { HostRepository } from "../../host/repositories/HostRepository";
import type { EventTypeRepository } from "../repositories/eventTypeRepository";

type SyncResultDetail = {
  eventTypeId: number;
  teamId: number;
  organizationId: number | null;
  added: { userId: number; membershipId: number }[];
  removed: { userId: number }[];
};

type SyncHostsMembershipsServiceDeps = {
  eventTypeRepository: EventTypeRepository;
  hostRepository: HostRepository;
  logger: ISimpleLogger;
};

type EventTypeWithTeam = {
  id: number;
  teamId: number;
  schedulingType: SchedulingType | null;
  hosts: Array<{ userId: number }>;
  team: {
    id: number;
    parentId: number | null;
    members: Array<{ id: number; userId: number }>;
  };
};

type EventTypeBasic = {
  id: number;
  teamId: number;
  schedulingType: SchedulingType | null;
};

type TeamMember = {
  userId: number;
  id: number;
};

type Host = {
  userId: number;
};

type OrphanedHostsHandlingResult = {
  removed: Array<{ userId: number }>;
  count: number;
};

type MissingMembersHandlingResult = {
  added: Array<{ userId: number; membershipId: number }>;
  count: number;
};

export type SyncResult = {
  hostsAdded: number;
  hostsRemoved: number;
  eventTypesProcessed: number;
  details: SyncResultDetail[];
};
export class SyncHostsMembershipsService {
  private eventTypeRepository: EventTypeRepository;
  private hostRepository: HostRepository;
  private logger: ISimpleLogger;

  constructor({ eventTypeRepository, hostRepository, logger }: SyncHostsMembershipsServiceDeps) {
    this.eventTypeRepository = eventTypeRepository;
    this.hostRepository = hostRepository;
    this.logger = logger;
  }

  async syncHostsWithMemberships(): Promise<SyncResult> {
    const result: SyncResult = {
      hostsAdded: 0,
      hostsRemoved: 0,
      eventTypesProcessed: 0,
      details: [],
    };

    const eventTypesWithAllTeamMembersAssigned =
      await this.eventTypeRepository.findAllOfTeamsBySchedulingTypeIncludeHostsAndTeamMembers({
        filters: {
          schedulingTypes: [SchedulingType.ROUND_ROBIN, SchedulingType.COLLECTIVE],
          assignAllTeamMembers: true,
        },
        limit: 100,
      });

    for (const eventType of eventTypesWithAllTeamMembersAssigned) {
      if (!eventType.team) continue;

      const eventTypeResult = await this.processEventType({
        ...eventType,
        team: eventType.team,
        teamId: eventType.team.id,
      });

      if (eventTypeResult) {
        result.eventTypesProcessed++;
        result.hostsAdded += eventTypeResult.hostsAdded;
        result.hostsRemoved += eventTypeResult.hostsRemoved;
        result.details.push(eventTypeResult.detail);
      }
    }

    return result;
  }

  private async processEventType(eventType: EventTypeWithTeam): Promise<{
    hostsAdded: number;
    hostsRemoved: number;
    detail: SyncResultDetail;
  } | null> {
    const teamMembers = eventType.team.members;
    const currentHosts = eventType.hosts;
    const organizationId = eventType.team.parentId;

    const teamMemberUserIds = new Set(teamMembers.map((m) => m.userId));
    const currentHostUserIds = new Set(currentHosts.map((h) => h.userId));

    const missingHostMembers = teamMembers.filter((m) => !currentHostUserIds.has(m.userId));
    const orphanedHosts = currentHosts.filter((h) => !teamMemberUserIds.has(h.userId));

    if (missingHostMembers.length === 0 && orphanedHosts.length === 0) {
      return null;
    }

    const eventTypeDetail: SyncResultDetail = {
      eventTypeId: eventType.id,
      teamId: eventType.team.id,
      organizationId,
      added: [],
      removed: [],
    };

    let hostsAdded = 0;
    let hostsRemoved = 0;

    if (missingHostMembers.length > 0) {
      const addedResult = await this.handleMissingMembersInHosts({
        eventType,
        missingHostMembers,
        organizationId,
      });
      eventTypeDetail.added = addedResult.added;
      hostsAdded = addedResult.count;
    }

    if (orphanedHosts.length > 0) {
      const removedResult = await this.handleOrphanedHosts({
        eventType,
        orphanedHosts,
        organizationId,
      });
      eventTypeDetail.removed = removedResult.removed;
      hostsRemoved = removedResult.count;
    }

    return {
      hostsAdded,
      hostsRemoved,
      detail: eventTypeDetail,
    };
  }

  private async handleMissingMembersInHosts({
    eventType,
    missingHostMembers,
    organizationId,
  }: {
    eventType: EventTypeBasic;
    missingHostMembers: TeamMember[];
    organizationId: number | null;
  }): Promise<MissingMembersHandlingResult> {
    const isFixed = eventType.schedulingType === SchedulingType.COLLECTIVE;

    await this.hostRepository.createMany(
      missingHostMembers.map((member) => ({
        userId: member.userId,
        eventTypeId: eventType.id,
        isFixed,
      }))
    );

    const addedMembers = missingHostMembers.map((m) => {
      return { userId: m.userId, membershipId: m.id };
    });

    this.logger.info("Added missing host to event type", {
      eventTypeId: eventType.id,
      teamId: eventType.teamId,
      organizationId,
      addedMembers,
    });

    return {
      added: addedMembers,
      count: missingHostMembers.length,
    };
  }

  private async handleOrphanedHosts({
    eventType,
    orphanedHosts,
    organizationId,
  }: {
    eventType: Pick<EventTypeBasic, "id" | "teamId">;
    orphanedHosts: Host[];
    organizationId: number | null;
  }): Promise<OrphanedHostsHandlingResult> {
    await this.hostRepository.deleteByEventTypeAndUserIds({
      eventTypeId: eventType.id,
      userIds: orphanedHosts.map((h) => h.userId),
    });

    const removedHosts = orphanedHosts.map((h) => {
      return { userId: h.userId };
    });
    this.logger.info(
      "Removed orphaned host from event type",
      safeStringify({
        eventTypeId: eventType.id,
        teamId: eventType.teamId,
        organizationId,
        removedHosts,
      })
    );

    return {
      removed: removedHosts,
      count: orphanedHosts.length,
    };
  }
}

import type { Logger } from "tslog";

import { SchedulingType } from "@calcom/prisma/enums";

import type { EventTypeRepository } from "../repositories/eventTypeRepository";
import type { HostRepository } from "../../host/repositories/HostRepository";

type SyncResultDetail = {
  eventTypeId: number;
  teamId: number;
  organizationId: number | null;
  added: { userId: number; membershipId: number }[];
  removed: { userId: number }[];
};

export type SyncResult = {
  hostsAdded: number;
  hostsRemoved: number;
  eventTypesProcessed: number;
  details: SyncResultDetail[];
};

type SyncHostsMembershipsServiceDeps = {
  eventTypeRepository: EventTypeRepository;
  hostRepository: HostRepository;
  logger: Logger;
};

export class SyncHostsMembershipsService {
  private eventTypeRepository: EventTypeRepository;
  private hostRepository: HostRepository;
  private logger: Logger;

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

    const eventTypesWithAssignAllTeamMembers =
      await this.eventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers([
        SchedulingType.ROUND_ROBIN,
        SchedulingType.COLLECTIVE,
      ]);

    for (const eventType of eventTypesWithAssignAllTeamMembers) {
      if (!eventType.team || !eventType.teamId) continue;

      const teamMembers = eventType.team.members;
      const currentHosts = eventType.hosts;
      const organizationId = eventType.team.parentId;

      const teamMemberUserIds = new Set(teamMembers.map((m) => m.userId));
      const currentHostUserIds = new Set(currentHosts.map((h) => h.userId));

      const missingHostMembers = teamMembers.filter((m) => !currentHostUserIds.has(m.userId));
      const orphanedHosts = currentHosts.filter((h) => !teamMemberUserIds.has(h.userId));

      if (missingHostMembers.length === 0 && orphanedHosts.length === 0) {
        continue;
      }

      result.eventTypesProcessed++;

      const eventTypeDetail: SyncResultDetail = {
        eventTypeId: eventType.id,
        teamId: eventType.teamId,
        organizationId,
        added: [],
        removed: [],
      };

      if (missingHostMembers.length > 0) {
        const isFixed = eventType.schedulingType === SchedulingType.COLLECTIVE;

        await this.hostRepository.createMany(
          missingHostMembers.map((member) => ({
            userId: member.userId,
            eventTypeId: eventType.id,
            isFixed,
          }))
        );

        for (const member of missingHostMembers) {
          this.logger.info("Added missing host to event type with assignAllTeamMembers=true", {
            eventTypeId: eventType.id,
            teamId: eventType.teamId,
            organizationId,
            userId: member.userId,
            membershipId: member.id,
          });
          eventTypeDetail.added.push({ userId: member.userId, membershipId: member.id });
          result.hostsAdded++;
        }
      }

      if (orphanedHosts.length > 0) {
        await this.hostRepository.deleteByEventTypeAndUserIds(
          eventType.id,
          orphanedHosts.map((h) => h.userId)
        );

        for (const host of orphanedHosts) {
          this.logger.info("Removed orphaned host from event type with assignAllTeamMembers=true", {
            eventTypeId: eventType.id,
            teamId: eventType.teamId,
            organizationId,
            userId: host.userId,
          });
          eventTypeDetail.removed.push({ userId: host.userId });
          result.hostsRemoved++;
        }
      }

      result.details.push(eventTypeDetail);
    }

    return result;
  }
}

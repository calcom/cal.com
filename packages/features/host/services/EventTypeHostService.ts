import { findTeamMembersMatchingAttributeLogic } from "@calcom/features/routing-forms/lib/findTeamMembersMatchingAttributeLogic";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { PrismaClient } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
import { ErrorWithCode } from "@calcom/lib/errors";

// --- Response DTOs ---

export type AvailabilityHost = {
  userId: number;
  isFixed: boolean;
  priority: number;
  weight: number;
  scheduleId: number | null;
  groupId: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type AssignmentHost = {
  userId: number;
  isFixed: boolean;
  priority: number;
  weight: number;
  scheduleId: number | null;
  groupId: string | null;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type AssignmentChild = {
  childEventTypeId: number;
  slug: string;
  hidden: boolean;
  owner: {
    id: number;
    name: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
  };
};

export type TeamMemberSearchResult = {
  userId: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  username: string | null;
  defaultScheduleId: number | null;
  role: MembershipRole;
};

export type ExportedWeightMember = {
  userId: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  weight: number | null;
};

// --- Paginated response wrappers ---

export type PaginatedAvailabilityHostsResponse = {
  hosts: AvailabilityHost[];
  nextCursor: number | undefined;
  hasMore: boolean;
};

export type PaginatedAssignmentHostsResponse = {
  hosts: AssignmentHost[];
  nextCursor: number | undefined;
  hasMore: boolean;
  hasFixedHosts?: boolean;
};

export type PaginatedAssignmentChildrenResponse = {
  children: AssignmentChild[];
  nextCursor: number | undefined;
  hasMore: boolean;
};

export type PaginatedTeamMembersResponse = {
  members: TeamMemberSearchResult[];
  nextCursor: number | undefined;
  hasMore: boolean;
};

export type ExportWeightsResponse = {
  members: ExportedWeightMember[];
};

// --- Service ---

export class EventTypeHostService {
  private hostRepository: HostRepository;
  private membershipRepository: MembershipRepository;
  private eventTypeRepository: EventTypeRepository;

  constructor(private prismaClient: PrismaClient) {
    this.hostRepository = new HostRepository(prismaClient);
    this.membershipRepository = new MembershipRepository(prismaClient);
    this.eventTypeRepository = new EventTypeRepository(prismaClient);
  }

  async getHostsForAvailability({
    eventTypeId,
    cursor,
    limit,
    search,
  }: {
    eventTypeId: number;
    cursor?: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedAvailabilityHostsResponse> {
    const { items, nextCursor, hasMore } = await this.hostRepository.findHostsPaginatedIncludeUser({
      eventTypeId,
      cursor,
      limit,
      search,
    });

    const hosts: AvailabilityHost[] = items.map((item) => ({
      userId: item.userId,
      isFixed: item.isFixed,
      priority: item.priority ?? 0,
      weight: item.weight ?? 100,
      scheduleId: item.scheduleId,
      groupId: item.groupId,
      name: item.user.name,
      avatarUrl: item.user.avatarUrl,
    }));

    return { hosts, nextCursor, hasMore };
  }

  async getHostsForAssignment({
    eventTypeId,
    cursor,
    limit,
    search,
    memberUserIds,
  }: {
    eventTypeId: number;
    cursor?: number;
    limit: number;
    search?: string;
    memberUserIds?: number[];
  }): Promise<PaginatedAssignmentHostsResponse> {
    const { items, nextCursor, hasMore, hasFixedHosts } =
      await this.hostRepository.findHostsPaginatedIncludeUserForAssignment({
        eventTypeId,
        cursor,
        limit,
        search,
        memberUserIds,
      });

    const hosts: AssignmentHost[] = items.map((item) => ({
      userId: item.userId,
      isFixed: item.isFixed,
      priority: item.priority ?? 0,
      weight: item.weight ?? 100,
      scheduleId: item.scheduleId,
      groupId: item.groupId,
      name: item.user.name,
      email: item.user.email,
      avatarUrl: item.user.avatarUrl,
    }));

    return { hosts, nextCursor, hasMore, ...(hasFixedHosts !== undefined && { hasFixedHosts }) };
  }

  async getChildrenForAssignment({
    eventTypeId,
    cursor,
    limit,
    search,
  }: {
    eventTypeId: number;
    cursor?: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedAssignmentChildrenResponse> {
    const { items, nextCursor, hasMore } =
      await this.hostRepository.findChildrenForAssignmentPaginated({
        eventTypeId,
        cursor,
        limit,
        search,
      });

    const children: AssignmentChild[] = items
      .filter((item) => item.owner !== null)
      .map((item) => ({
        childEventTypeId: item.id,
        slug: item.slug,
        hidden: item.hidden,
        owner: {
          id: item.owner!.id,
          name: item.owner!.name,
          email: item.owner!.email,
          username: item.owner!.username,
          avatarUrl: item.owner!.avatarUrl,
        },
      }));

    return { children, nextCursor, hasMore };
  }

  async searchTeamMembers({
    teamId,
    userId,
    cursor,
    limit,
    search,
    memberUserIds,
  }: {
    teamId: number;
    userId: number;
    cursor?: number | null;
    limit: number;
    search?: string | null;
    memberUserIds?: number[] | null;
  }): Promise<PaginatedTeamMembersResponse> {
    const isMember = await this.membershipRepository.hasMembership({ teamId, userId });
    if (!isMember) {
      throw ErrorWithCode.Factory.Forbidden("You are not a member of this team");
    }

    const { memberships, nextCursor, hasMore } = await this.membershipRepository.searchMembers({
      teamId,
      search,
      cursor,
      limit,
      memberUserIds,
    });

    const members: TeamMemberSearchResult[] = memberships.map((membership) => ({
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      avatarUrl: membership.user.avatarUrl,
      username: membership.user.username,
      defaultScheduleId: membership.user.defaultScheduleId,
      role: membership.role,
    }));

    return { members, nextCursor, hasMore };
  }

  async exportHostsForWeights({
    eventTypeId,
    assignAllTeamMembers,
    assignRRMembersUsingSegment,
    attributesQueryValue,
    organizationId,
  }: {
    eventTypeId: number;
    assignAllTeamMembers: boolean;
    assignRRMembersUsingSegment?: boolean;
    attributesQueryValue?: AttributesQueryValue | null;
    organizationId: number | null;
  }): Promise<ExportWeightsResponse> {
    // Derive teamId from the event type to prevent cross-team enumeration
    const eventType = await this.eventTypeRepository.getTeamIdByEventTypeId({ id: eventTypeId });
    const teamId = eventType?.teamId;

    const segmentMemberIds = teamId
      ? await this.getSegmentMemberIds({
          teamId,
          organizationId,
          assignRRMembersUsingSegment,
          attributesQueryValue,
        })
      : null;

    if (assignAllTeamMembers && teamId) {
      const memberships = await this.membershipRepository.findAcceptedMembersWithUserProfile({
        teamId,
      });

      let members: ExportedWeightMember[] = memberships.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        weight: null,
      }));

      if (segmentMemberIds) {
        members = members.filter((m) => segmentMemberIds.has(m.userId));
      }

      return { members };
    }

    // Fetch all non-fixed hosts for this event type
    const hosts = await this.hostRepository.findAllRoundRobinHosts({ eventTypeId });

    let members: ExportedWeightMember[] = hosts.map((h) => ({
      userId: h.userId,
      name: h.user.name,
      email: h.user.email,
      avatarUrl: h.user.avatarUrl,
      weight: h.weight ?? 100,
    }));

    if (segmentMemberIds) {
      members = members.filter((m) => segmentMemberIds.has(m.userId));
    }

    return { members };
  }

  private async getSegmentMemberIds({
    teamId,
    organizationId,
    assignRRMembersUsingSegment,
    attributesQueryValue,
  }: {
    teamId: number;
    organizationId: number | null;
    assignRRMembersUsingSegment?: boolean;
    attributesQueryValue?: AttributesQueryValue | null;
  }): Promise<Set<number> | null> {
    if (!assignRRMembersUsingSegment || !attributesQueryValue) {
      return null;
    }

    if (!organizationId) return null;

    const { teamMembersMatchingAttributeLogic } = await findTeamMembersMatchingAttributeLogic(
      {
        teamId,
        attributesQueryValue,
        orgId: organizationId,
      },
      { enablePerf: false }
    );

    if (!teamMembersMatchingAttributeLogic) return null;

    return new Set(teamMembersMatchingAttributeLogic.map((m) => m.userId));
  }
}

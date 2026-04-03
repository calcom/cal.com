import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import type { MembershipRole } from "@calcom/prisma/enums";

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

// --- Service Interface ---

export interface IEventTypeHostService {
  getHostsForAvailability(input: {
    eventTypeId: number;
    cursor?: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedAvailabilityHostsResponse>;

  getHostsForAssignment(input: {
    eventTypeId: number;
    cursor?: number;
    limit: number;
    search?: string;
    memberUserIds?: number[];
  }): Promise<PaginatedAssignmentHostsResponse>;

  getChildrenForAssignment(input: {
    eventTypeId: number;
    cursor?: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedAssignmentChildrenResponse>;

  searchTeamMembers(input: {
    teamId: number;
    userId: number;
    cursor?: number | null;
    limit: number;
    search?: string | null;
    memberUserIds?: number[] | null;
  }): Promise<PaginatedTeamMembersResponse>;

  exportHostsForWeights(input: {
    eventTypeId: number;
    assignAllTeamMembers: boolean;
    assignRRMembersUsingSegment?: boolean;
    attributesQueryValue?: AttributesQueryValue | null;
    organizationId: number | null;
  }): Promise<ExportWeightsResponse>;
}

import { Injectable } from "@nestjs/common";

type Host = {
  isFixed: boolean;
  user: Record<string, unknown>;
  groupId?: string | null;
};

type User = Record<string, unknown>;

type QualifiedHost = { user: Record<string, unknown>; isFixed?: boolean; groupId?: string | null };

@Injectable()
export class QualifiedHostsService {
  async getQualifiedUsers(
    _hosts: { userId: number; isFixed: boolean }[],
    _input: { eventTypeId: number; startTime: string; endTime: string }
  ): Promise<{ userId: number; isFixed: boolean; priority: number }[]> {
    // In community edition, all hosts qualify
    return _hosts.map((host) => ({ ...host, priority: 0 }));
  }

  async findQualifiedHostsWithDelegationCredentials(...args: unknown[]): Promise<{
    qualifiedRRHosts: QualifiedHost[];
    allFallbackRRHosts: QualifiedHost[];
    fixedHosts: QualifiedHost[];
  }> {
    const input = (args[0] ?? {}) as Record<string, unknown>;
    const eventType = (input.eventType ?? {}) as Record<string, unknown>;
    const contactOwnerEmail = input.contactOwnerEmail as string | null | undefined;
    const routedTeamMemberIds = (input.routedTeamMemberIds ?? []) as number[];

    const hosts = (eventType.hosts ?? []) as Host[];
    const users = (eventType.users ?? []) as User[];
    const schedulingType = eventType.schedulingType as string | null | undefined;

    if (hosts.length > 0) {
      const fixedHosts: QualifiedHost[] = [];
      const allRRHosts: QualifiedHost[] = [];

      for (const host of hosts) {
        const qualifiedHost: QualifiedHost = {
          user: host.user,
          isFixed: host.isFixed,
          groupId: host.groupId ?? null,
        };

        if (host.isFixed || schedulingType !== "ROUND_ROBIN") {
          fixedHosts.push(qualifiedHost);
        } else {
          allRRHosts.push(qualifiedHost);
        }
      }

      let qualifiedRRHosts = allRRHosts;

      if (contactOwnerEmail) {
        const contactOwnerHost = allRRHosts.filter(
          (h) => (h.user as { email?: string }).email === contactOwnerEmail
        );
        if (contactOwnerHost.length > 0) {
          qualifiedRRHosts = contactOwnerHost;
        }
      } else if (routedTeamMemberIds.length > 0) {
        const routedMemberIdSet = new Set(routedTeamMemberIds);
        const routedHosts = allRRHosts.filter((h) => routedMemberIdSet.has((h.user as { id: number }).id));
        if (routedHosts.length > 0) {
          qualifiedRRHosts = routedHosts;
        }
      }

      return { qualifiedRRHosts, allFallbackRRHosts: allRRHosts, fixedHosts };
    }

    if (users.length > 0) {
      const fixedHosts = users.map((user) => ({
        user,
        isFixed: true as const,
        groupId: null,
      }));
      return { qualifiedRRHosts: [], allFallbackRRHosts: [], fixedHosts };
    }

    return { qualifiedRRHosts: [], allFallbackRRHosts: [], fixedHosts: [] };
  }
}

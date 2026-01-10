import { DEFAULT_GROUP_ID } from "@calcom/lib/constants";

export function groupHostsByGroupId<T extends { groupId?: string | null }>({
  hosts,
  hostGroups,
}: {
  hosts: T[];
  hostGroups?: { id: string }[];
}): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  const hasGroups = hostGroups && hostGroups.length > 0;

  if (hasGroups) {
    hostGroups.forEach((group) => {
      groups[group.id] = [];
    });
  } else {
    groups[DEFAULT_GROUP_ID] = [];
  }

  hosts.forEach((host) => {
    const groupId = hasGroups && host.groupId ? host.groupId : DEFAULT_GROUP_ID;
    if (groups[groupId]) {
      groups[groupId].push(host);
    }
  });

  return groups;
}

export function getHostsFromOtherGroups<T extends { groupId?: string | null }>(
  hosts: readonly T[],
  groupId: string | null
): T[] {
  return hosts.filter(
    (host) => (groupId && (!host.groupId || host.groupId !== groupId)) || (!groupId && host.groupId)
  );
}

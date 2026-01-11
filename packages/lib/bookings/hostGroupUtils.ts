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

export function sortHosts(
  hostA: { priority: number | null; weight: number | null },
  hostB: { priority: number | null; weight: number | null },
  isRRWeightsEnabled: boolean
) {
  const weightA = hostA.weight ?? 100;
  const priorityA = hostA.priority ?? 2;
  const weightB = hostB.weight ?? 100;
  const priorityB = hostB.priority ?? 2;

  if (isRRWeightsEnabled) {
    if (weightA === weightB) {
      return priorityB - priorityA;
    } else {
      return weightB - weightA;
    }
  } else {
    return priorityB - priorityA;
  }
}

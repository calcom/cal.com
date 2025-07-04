export function groupHostsByGroupId<T extends { groupId?: string | null }>({
  hosts,
  hostGroups,
}: {
  hosts: T[];
  hostGroups?: { id: string }[];
}) {
  const groups: Record<string, T[]> = {};
  const defaultGroupId = "default_group_id";

  const hasGroups = hostGroups && hostGroups.length > 0;

  if (hasGroups) {
    hostGroups.forEach((group) => {
      groups[group.id] = [];
    });
  } else {
    groups[defaultGroupId] = [];
  }

  hosts.forEach((host) => {
    const groupId = hasGroups && host.groupId ? host.groupId : defaultGroupId;
    if (groups[groupId]) {
      groups[groupId].push(host);
    }
  });

  return groups;
}

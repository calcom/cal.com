const DEFAULT_GROUP_ID = "default";

type RRHost<T> = {
  isFixed: boolean;
  createdAt: Date | null;
  priority?: number | null;
  weight?: number | null;
  groupId?: string | null;
  user: T & { id: number; email: string };
};

export type SelectHostsForPartialLoadingParams<T> = {
  hosts: RRHost<T>[];
  orderedUserIds: number[];
  partialLoadPercentage: number;
  partialLoadMinimum: number;
};

export type SelectHostsForPartialLoadingResult<T> = {
  selectedHosts: RRHost<T>[];
  totalHosts: number;
  loadedHosts: number;
  isPartialLoad: boolean;
};

/**
 * Selects a subset of round-robin hosts for partial loading based on an ordered list.
 * The ordering should come from LuckyUserService.getOrderedHostsForPartialLoading()
 * which respects priority ranking and weight-based shortfall calculation.
 *
 * This function handles:
 * 1. Fixed hosts (always included)
 * 2. RR group constraints (at least one host per group)
 * 3. Partial load percentage/minimum calculation
 */
export function selectHostsForPartialLoading<T>({
  hosts,
  orderedUserIds,
  partialLoadPercentage,
  partialLoadMinimum,
}: SelectHostsForPartialLoadingParams<T>): SelectHostsForPartialLoadingResult<T> {
  const fixedHosts = hosts.filter((h) => h.isFixed);
  const rrHosts = hosts.filter((h) => !h.isFixed);

  if (rrHosts.length === 0) {
    return {
      selectedHosts: fixedHosts,
      totalHosts: hosts.length,
      loadedHosts: fixedHosts.length,
      isPartialLoad: false,
    };
  }

  const targetCount = Math.max(partialLoadMinimum, Math.ceil((rrHosts.length * partialLoadPercentage) / 100));

  if (targetCount >= rrHosts.length) {
    return {
      selectedHosts: hosts,
      totalHosts: hosts.length,
      loadedHosts: hosts.length,
      isPartialLoad: false,
    };
  }

  // Create a map for quick lookup of host by user ID
  const hostByUserId = new Map<number, RRHost<T>>();
  for (const host of rrHosts) {
    hostByUserId.set(host.user.id, host);
  }

  // Sort RR hosts by the order from LuckyUserService
  const orderedRRHosts: RRHost<T>[] = [];
  const orderedUserIdSet = new Set(orderedUserIds);

  // First, add hosts in the order provided by LuckyUserService
  for (const userId of orderedUserIds) {
    const host = hostByUserId.get(userId);
    if (host) {
      orderedRRHosts.push(host);
    }
  }

  // Add any remaining hosts that weren't in the ordered list (shouldn't happen, but be safe)
  for (const host of rrHosts) {
    if (!orderedUserIdSet.has(host.user.id)) {
      orderedRRHosts.push(host);
    }
  }

  // Select hosts ensuring at least one from each group
  const selectedRRHosts: RRHost<T>[] = [];
  const selectedUserIds = new Set<number>();

  // Group hosts by their groupId
  const hostsByGroup = new Map<string, RRHost<T>[]>();
  for (const host of orderedRRHosts) {
    const groupId = host.groupId ?? DEFAULT_GROUP_ID;
    if (!hostsByGroup.has(groupId)) {
      hostsByGroup.set(groupId, []);
    }
    hostsByGroup.get(groupId)!.push(host);
  }

  // First, ensure at least one host from each group (pick the highest-ranked in each group)
  for (const [, groupHosts] of Array.from(hostsByGroup.entries())) {
    if (groupHosts.length > 0) {
      const bestInGroup = groupHosts[0]; // Already sorted by priority/shortfall
      selectedRRHosts.push(bestInGroup);
      selectedUserIds.add(bestInGroup.user.id);
    }
  }

  // Then fill up to targetCount with remaining hosts in order
  for (const host of orderedRRHosts) {
    if (selectedRRHosts.length >= targetCount) {
      break;
    }
    if (!selectedUserIds.has(host.user.id)) {
      selectedRRHosts.push(host);
      selectedUserIds.add(host.user.id);
    }
  }

  const selectedHosts = [...fixedHosts, ...selectedRRHosts];

  return {
    selectedHosts,
    totalHosts: hosts.length,
    loadedHosts: selectedHosts.length,
    isPartialLoad: selectedHosts.length < hosts.length,
  };
}

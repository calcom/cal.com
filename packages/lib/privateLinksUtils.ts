export function isLinkExpired(link: {
  expiresAt?: Date | string | null;
  maxUsageCount?: number | null;
  usageCount?: number | null;
}): boolean {
  const now = new Date();

  // Check if time-based expiration has passed
  if (link.expiresAt) {
    const expirationDate = new Date(link.expiresAt);

    if (expirationDate < now) {
      return true;
    }
    return false;
  }

  // Check if usage-based expiration has been reached
  if (link.maxUsageCount && link.maxUsageCount > 0) {
    const usageCount = link.usageCount || 0;

    if (usageCount >= link.maxUsageCount) {
      return true;
    }
  }

  return false;
}

export function filterActiveLinks<
  T extends {
    expiresAt?: Date | null;
    maxUsageCount?: number | null;
    usageCount?: number | null;
  }
>(links: T[]): T[] {
  return links.filter((link) => !isLinkExpired(link));
}

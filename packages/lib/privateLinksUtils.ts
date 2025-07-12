import dayjs from "@calcom/dayjs";

export function isLinkExpired(
  link: {
    expiresAt?: Date | string | null;
    maxUsageCount?: number | null;
    usageCount?: number | null;
  },
  timezone?: string | null
): boolean {
  // Check if time-based expiration has passed
  if (link.expiresAt) {
    if (timezone) {
      // Use dayjs for timezone-aware comparison
      const now = dayjs().tz(timezone);
      const expiration = dayjs(link.expiresAt).tz(timezone);

      if (expiration.isBefore(now)) {
        return true;
      }
    } else {
      // Fallback to UTC comparison if no timezone available
      const now = dayjs();
      const expiration = dayjs(link.expiresAt);

      if (expiration.isBefore(now)) {
        return true;
      }
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
>(links: T[], timezone?: string | null): T[] {
  return links.filter((link) => !isLinkExpired(link, timezone));
}

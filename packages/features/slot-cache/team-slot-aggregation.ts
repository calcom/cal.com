import type { CachedSlot } from "./slot-cache.repository";

export function aggregateCollectiveSlots(userSlots: Map<number, CachedSlot[]>): CachedSlot[] {
  const allUserSlotArrays = Array.from(userSlots.values());
  if (allUserSlotArrays.length === 0) return [];

  const firstUserSlots = allUserSlotArrays[0];
  return firstUserSlots
    .filter((slot) => {
      return allUserSlotArrays.every((userSlotArray) =>
        userSlotArray.some((userSlot) => userSlot.time === slot.time)
      );
    })
    .map((slot) => ({
      ...slot,
      userIds: Array.from(userSlots.keys()), // All users available for collective
    }));
}

export function aggregateRoundRobinSlots(userSlots: Map<number, CachedSlot[]>): CachedSlot[] {
  const allSlots = new Map<string, CachedSlot>();

  for (const [userId, slots] of Array.from(userSlots.entries())) {
    for (const slot of slots) {
      const existing = allSlots.get(slot.time);
      if (existing) {
        existing.userIds = [...(existing.userIds || []), userId];
      } else {
        allSlots.set(slot.time, {
          ...slot,
          userIds: [userId],
        });
      }
    }
  }

  return Array.from(allSlots.values()).sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

export async function generateAndCacheTeamSlots(
  allUsersAvailability: any[],
  baseParams: any,
  slotCacheRepo: any
): Promise<any[]> {
  return [];
}

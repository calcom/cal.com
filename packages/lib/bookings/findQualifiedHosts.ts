import { getNormalizedHosts } from "@calcom/lib/bookings/getRoutedUsers";
import type { SchedulingType } from "@calcom/prisma/enums";

import { filterHostsByLeadThreshold } from "./filterHostsByLeadThreshold";

export const findQualifiedHosts = async <T extends { email: string; id: number } & Record<string, unknown>>(
  eventType: {
    id: number;
    maxLeadThreshold: number | null;
    hosts?: ({ isFixed: boolean; createdAt: Date; priority?: number | null; weight?: number | null } & {
      user: T;
    })[];
    users: T[];
    schedulingType: SchedulingType | null;
    rescheduleWithSameRoundRobinHost: boolean;
  },
  isReschedule: boolean
): Promise<
  {
    isFixed: boolean;
    email: string;
    createdAt: Date | null;
    priority?: number | null;
    weight?: number | null;
    user: T;
  }[]
> => {
  const { hosts, fallbackHosts } = getNormalizedHosts({ eventType });
  const qualifiedHosts = hosts
    ? await filterHostsByLeadThreshold({
        eventTypeId: eventType.id,
        hosts,
        maxLeadThreshold:
          isReschedule && eventType.rescheduleWithSameRoundRobinHost ? null : eventType.maxLeadThreshold,
      })
    : fallbackHosts;
  return qualifiedHosts;
};

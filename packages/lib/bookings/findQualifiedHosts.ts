import type { Host } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/client";

import { filterHostsByLeadThreshold } from "./filterHostsByLeadThreshold";

export const findQualifiedHosts = async <
  T extends { email: string; id: number } & Record<string, unknown>
>(eventType: {
  id: number;
  maxLeadThreshold: number | null;
  hosts?: (Pick<Host, "isFixed" | "createdAt"> & {
    user: T;
  })[];
  users?: T[];
  schedulingType: SchedulingType | null;
}): Promise<
  {
    isFixed: boolean;
    email: string;
    user: T;
  }[]
> => {
  const hosts =
    eventType.hosts?.length && eventType.schedulingType
      ? await filterHostsByLeadThreshold({
          eventTypeId: eventType.id,
          hosts: eventType.hosts.map((host) => ({
            isFixed: host.isFixed,
            createdAt: host.createdAt,
            email: host.user.email,
            user: host.user,
          })),
          maxLeadThreshold: eventType.maxLeadThreshold,
        })
      : (eventType.users || []).map((user) => {
          return {
            isFixed: !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE,
            email: user.email,
            user: user,
          };
        });
  return hosts;
};

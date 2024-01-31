import { prisma } from "@calcom/prisma";
import { unlockedManagedEventTypeProps } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "./../trpc/server/trpc";
import createEventType from "./createEventType";

interface CreateDefaultTeamEventsProps {
  teamId: number;
  user: NonNullable<TrpcSessionUser>;
}

export default async function createDefaultTeamEvents({ teamId, user }: CreateDefaultTeamEventsProps) {
  const defaultTeamEvents = [
    {
      title: "Collective Team Event",
      slug: "collective-team-event",
      length: 15,
      teamId,
      schedulingType: "COLLECTIVE" as const,
    },
    {
      title: "Round Robin Team Event",
      slug: "round-robin-team-event",
      length: 15,
      teamId,
      schedulingType: "ROUND_ROBIN" as const,
    },
    {
      title: "Managed Event",
      slug: "managed-event",
      length: 30,
      teamId,
      schedulingType: "MANAGED" as const,
      metadata: {
        managedEventConfig: {
          unlockedFields: unlockedManagedEventTypeProps,
        },
      },
    },
  ];

  defaultTeamEvents.forEach(async (teamEvent) => {
    await createEventType({
      prisma,
      user,
      ...teamEvent,
    });
  });
}

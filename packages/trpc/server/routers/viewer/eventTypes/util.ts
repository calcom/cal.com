import { z } from "zod";

import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus, MembershipRole, PeriodType } from "@calcom/prisma/enums";
import type { CustomInputSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import type { EventTypeUpdateInput } from "./types";

export const eventOwnerProcedure = authedProcedure
  .input(
    z.object({
      id: z.number(),
      users: z.array(z.number()).optional().default([]),
    })
  )
  .use(async ({ ctx, input, next }) => {
    // Prevent non-owners to update/delete a team event
    const event = await ctx.prisma.eventType.findUnique({
      where: { id: input.id },
      include: {
        users: {
          select: {
            id: true,
          },
        },
        team: {
          select: {
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const isAuthorized = (function () {
      if (event.team) {
        const isOrgAdmin = !!ctx.user?.organization?.isOrgAdmin;
        return (
          event.team.members
            .filter((member) => member.role === MembershipRole.OWNER || member.role === MembershipRole.ADMIN)
            .map((member) => member.userId)
            .includes(ctx.user.id) || isOrgAdmin
        );
      }
      return event.userId === ctx.user.id || event.users.find((user) => user.id === ctx.user.id);
    })();

    if (!isAuthorized) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const isAllowed = (function () {
      if (event.team) {
        const allTeamMembers = event.team.members.map((member) => member.userId);
        return input.users.every((userId: number) => allTeamMembers.includes(userId));
      }
      return input.users.every((userId: number) => userId === ctx.user.id);
    })();

    if (!isAllowed) {
      console.warn(
        `User ${ctx.user.id} attempted to an create an event for users ${input.users.join(", ")}.`
      );
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next();
  });

export function isPeriodType(keyInput: string): keyInput is PeriodType {
  return Object.keys(PeriodType).includes(keyInput);
}

export function handlePeriodType(periodType: string | undefined): PeriodType | undefined {
  if (typeof periodType !== "string") return undefined;
  const passedPeriodType = periodType.toUpperCase();
  if (!isPeriodType(passedPeriodType)) return undefined;
  return PeriodType[passedPeriodType];
}

export function handleCustomInputs(customInputs: CustomInputSchema[], eventTypeId: number) {
  const cInputsIdsToDeleteOrUpdated = customInputs.filter((input) => !input.hasToBeCreated);
  const cInputsIdsToDelete = cInputsIdsToDeleteOrUpdated.map((e) => e.id);
  const cInputsToCreate = customInputs
    .filter((input) => input.hasToBeCreated)
    .map((input) => ({
      type: input.type,
      label: input.label,
      required: input.required,
      placeholder: input.placeholder,
      options: input.options || undefined,
    }));
  const cInputsToUpdate = cInputsIdsToDeleteOrUpdated.map((input) => ({
    data: {
      type: input.type,
      label: input.label,
      required: input.required,
      placeholder: input.placeholder,
      options: input.options || undefined,
    },
    where: {
      id: input.id,
    },
  }));

  return {
    deleteMany: {
      eventTypeId,
      NOT: {
        id: { in: cInputsIdsToDelete },
      },
    },
    createMany: {
      data: cInputsToCreate,
    },
    update: cInputsToUpdate,
  };
}

export function ensureUniqueBookingFields(fields: z.infer<typeof EventTypeUpdateInput>["bookingFields"]) {
  if (!fields) {
    return;
  }

  fields.reduce((discoveredFields, field) => {
    if (discoveredFields[field.name]) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Duplicate booking field name: ${field.name}`,
      });
    }

    discoveredFields[field.name] = true;

    return discoveredFields;
  }, {} as Record<string, true>);
}

type Host = {
  userId: number;
  isFixed?: boolean | undefined;
  priority?: number | null | undefined;
  weight?: number | null | undefined;
};

type User = {
  id: number;
  email: string;
};

export async function addWeightAdjustmentToNewHosts({
  hosts,
  isWeightsEnabled,
  eventTypeId,
  prisma,
}: {
  hosts: Host[];
  isWeightsEnabled: boolean;
  eventTypeId: number;
  prisma: PrismaClient;
}): Promise<(Host & { weightAdjustment?: number })[]> {
  if (!isWeightsEnabled) return hosts;

  // to also have the user email to check for attendees
  const usersWithHostData = await prisma.user.findMany({
    where: {
      id: {
        in: hosts.map((host) => host.userId),
      },
    },
    select: {
      email: true,
      id: true,
      hosts: {
        where: {
          eventTypeId,
        },
        select: {
          isFixed: true,
          weightAdjustment: true,
          priority: true,
          weight: true,
        },
      },
    },
  });

  const hostsWithUserData = usersWithHostData.map((user) => {
    const hostData = user.hosts[0] ?? hosts.find((host) => host.userId === user.id);
    return {
      isNewHost: !user.hosts.length,
      isFixed: hostData?.isFixed ?? false,
      weightAdjustment: hostData?.weightAdjustment ?? 0,
      priority: hostData?.priority ?? 2,
      weight: hostData?.weight ?? 100,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  });

  const ongoingRRHosts = hostsWithUserData.filter((host) => !host.isFixed && !host.isNewHost);

  if (ongoingRRHosts.length === hosts.length) {
    //no new RR host was added
    return hosts;
  }

  const ongoingHostBookings = await getAllBookingsOfUsers({
    users: ongoingRRHosts.map((host) => {
      return { id: host.user.id, email: host.user.email };
    }),
    eventTypeId,
    prisma,
  });

  const ongoingHostsWeightAdjustment = ongoingRRHosts.reduce(
    (sum, host) => sum + (host.weightAdjustment ?? 0),
    0
  );

  const ongoingHostsWeights = ongoingRRHosts.reduce((sum, host) => sum + (host.weight ?? 0), 0);

  const hostsWithWeightAdjustments = await Promise.all(
    hostsWithUserData.map(async (host) => {
      let weightAdjustment = 0;
      if (host.isNewHost) {
        // host can already have bookings, if they ever was assigned before
        const existingBookings = await getAllBookingsOfUsers({
          users: [{ id: host.user.id, email: host.user.email }],
          eventTypeId,
          prisma,
        });

        const proporationalNrOfBookings =
          ((ongoingHostBookings.length + ongoingHostsWeightAdjustment) / ongoingHostsWeights) * host.weight;
        weightAdjustment = proporationalNrOfBookings - existingBookings.length;
      }

      return {
        userId: host.user.id,
        isFixed: host.isFixed,
        priority: host.priority,
        weight: host.weightAdjustment,
        weightAdjustment: weightAdjustment > 0 ? Math.floor(weightAdjustment) : 0,
      };
    })
  );

  return hostsWithWeightAdjustments;
}

async function getAllBookingsOfUsers({
  users,
  eventTypeId,
  prisma,
}: {
  users: { id: number; email: string }[];
  eventTypeId: number;
  prisma: PrismaClient;
}) {
  const allBookings = await prisma.booking.findMany({
    where: {
      eventTypeId,
      status: BookingStatus.ACCEPTED,
      OR: [
        {
          user: {
            id: {
              in: users.map((user) => user.id),
            },
          },
        },
        {
          attendees: {
            some: {
              email: {
                in: users.map((user) => user.email),
              },
            },
          },
        },
      ],
    },
    select: {
      attendees: true,
      userId: true,
    },
  });

  return allBookings;
}

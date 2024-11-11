import { z } from "zod";

import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { MembershipRole, PeriodType } from "@calcom/prisma/enums";
import type { CustomInputSchema } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import type { TUpdateInputSchema } from "./types";

type EventType = Awaited<ReturnType<typeof EventTypeRepository.findAllByUpId>>[number];

export const eventOwnerProcedure = authedProcedure
  .input(
    z
      .object({
        id: z.number().optional(),
        eventTypeId: z.number().optional(),
        users: z.array(z.number()).optional().default([]),
      })
      .refine((data) => data.id !== undefined || data.eventTypeId !== undefined, {
        message: "At least one of 'id' or 'eventTypeId' must be present",
        path: ["id", "eventTypeId"],
      })
  )
  .use(async ({ ctx, input, next }) => {
    const id = input.eventTypeId ?? input.id;
    // Prevent non-owners to update/delete a team event
    const event = await ctx.prisma.eventType.findUnique({
      where: { id },
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

export function ensureUniqueBookingFields(fields: TUpdateInputSchema["bookingFields"]) {
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

export function ensureEmailOrPhoneNumberIsPresent(fields: TUpdateInputSchema["bookingFields"]) {
  if (!fields || fields.length === 0) {
    return;
  }

  const attendeePhoneNumberField = fields.find((field) => field.name === "attendeePhoneNumber");

  const emailField = fields.find((field) => field.name === "email");

  if (emailField?.hidden && attendeePhoneNumberField?.hidden) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Both Email and Attendee Phone Number cannot be hidden`,
    });
  }
  if (!emailField?.required && !attendeePhoneNumberField?.required) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `At least Email or Attendee Phone Number need to be required field.`,
    });
  }
}

type Host = {
  userId: number;
  isFixed?: boolean | undefined;
  priority?: number | null | undefined;
  weight?: number | null | undefined;
  scheduleId?: number | null | undefined;
};

type User = {
  id: number;
  email: string;
};

export const mapEventType = async (eventType: EventType) => ({
  ...eventType,
  safeDescription: eventType?.description ? markdownToSafeHTML(eventType.description) : undefined,
  users: await Promise.all(
    (!!eventType?.hosts?.length ? eventType?.hosts.map((host) => host.user) : eventType.users).map(
      async (u) =>
        await UserRepository.enrichUserWithItsProfile({
          user: u,
        })
    )
  ),
  metadata: eventType.metadata ? EventTypeMetaDataSchema.parse(eventType.metadata) : null,
  children: await Promise.all(
    (eventType.children || []).map(async (c) => ({
      ...c,
      users: await Promise.all(
        c.users.map(
          async (u) =>
            await UserRepository.enrichUserWithItsProfile({
              user: u,
            })
        )
      ),
    }))
  ),
});

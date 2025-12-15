import { randomBytes } from "crypto";

import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateOneOffMeetingInputSchema } from "./create.schema";

type CreateHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateOneOffMeetingInputSchema;
};

/**
 * Generates a unique hash for the one-off meeting link
 */
function generateLinkHash(): string {
  return randomBytes(16).toString("hex");
}

export const createHandler = async ({ ctx, input }: CreateHandlerOptions) => {
  const { title, description, duration, location, timeZone, offeredSlots } = input;

  const linkHash = generateLinkHash();

  const oneOffMeeting = await prisma.oneOffMeeting.create({
    data: {
      title,
      description,
      duration,
      location: location ?? null,
      timeZone,
      linkHash,
      userId: ctx.user.id,
      offeredSlots: {
        createMany: {
          data: offeredSlots.map((slot) => ({
            startTime: new Date(slot.startTime),
            endTime: new Date(slot.endTime),
          })),
        },
      },
    },
    select: {
      id: true,
      title: true,
      duration: true,
      linkHash: true,
      status: true,
      createdAt: true,
      offeredSlots: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  return {
    ...oneOffMeeting,
    bookingLink: `/one-off/${linkHash}`,
  };
};


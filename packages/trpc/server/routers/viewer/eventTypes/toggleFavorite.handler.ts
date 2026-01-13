import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";

export type ToggleFavoriteInput = {
  eventTypeId: number;
  favorite: boolean;
};

export const toggleFavoriteHandler = async ({
  ctx,
  input,
}: {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: ToggleFavoriteInput;
}) => {
  const { user } = ctx;
  const { eventTypeId, favorite } = input;

  // Ensure the event type is accessible by user
  const allowed = await prisma.eventType.findFirst({
    where: {
      id: eventTypeId,
      OR: [
        { userId: user.id },
        { users: { some: { id: user.id } } },
        { team: { members: { some: { userId: user.id } } } },
      ],
    },
    select: { id: true },
  });

  if (!allowed) {
    throw new Error("FORBIDDEN");
  }

  if (favorite) {
    await prisma.favoriteEventType.upsert({
      where: { userId_eventTypeId: { userId: user.id, eventTypeId } },
      create: { userId: user.id, eventTypeId },
      update: {},
    });
  } else {
    await prisma.favoriteEventType.deleteMany({
      where: { userId: user.id, eventTypeId },
    });
  }

  return { ok: true };
};

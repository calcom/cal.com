import { prisma } from "@calcom/prisma";
import type { Actor } from "@calcom/prisma/client";

import type { IActorRepository } from "./IActorRepository";

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

export class PrismaActorRepository implements IActorRepository {
  async findByUserId(userId: number): Promise<Actor | null> {
    return prisma.actor.findUnique({
      where: { userId },
    });
  }

  async upsertUserActor(userId: number): Promise<Actor> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    return prisma.actor.upsert({
      where: { userId },
      update: {
        email: user.email,
        name: user.name,
      },
      create: {
        type: "USER",
        userId,
        email: user.email,
        name: user.name,
      },
    });
  }

  async getSystemActor(): Promise<Actor> {
    const actor = await prisma.actor.findUnique({
      where: { id: SYSTEM_ACTOR_ID },
    });

    if (!actor) {
      throw new Error("System actor not found");
    }

    return actor;
  }
}


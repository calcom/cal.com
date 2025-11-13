import { prisma } from "@calcom/prisma";
import type { AuditActor } from "@calcom/prisma/client";

import type { IAuditActorRepository } from "./IAuditActorRepository";

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

export class PrismaAuditActorRepository implements IAuditActorRepository {
  async findByUserId(userId: number): Promise<AuditActor | null> {
    return prisma.auditActor.findUnique({
      where: { userId },
    });
  }

  async upsertUserActor(userId: number): Promise<AuditActor> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    return prisma.auditActor.upsert({
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

  async getSystemActor(): Promise<AuditActor> {
    const actor = await prisma.auditActor.findUnique({
      where: { id: SYSTEM_ACTOR_ID },
    });

    if (!actor) {
      throw new Error("System actor not found");
    }

    return actor;
  }
}


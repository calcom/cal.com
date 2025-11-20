import type { PrismaClient } from "@calcom/prisma/client";
import type { IAuditActorRepository } from "./IAuditActorRepository";

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

type Dependencies = {
    prismaClient: PrismaClient;
}
export class PrismaAuditActorRepository implements IAuditActorRepository {
    constructor(private readonly deps: Dependencies) { }
    async findByUserUuid(userUuid: string) {
        return this.deps.prismaClient.auditActor.findUnique({
            where: { userUuid },
        });
    }

    async findSystemActorOrThrow() {
        const actor = await this.deps.prismaClient.auditActor.findUnique({
            where: { id: SYSTEM_ACTOR_ID },
        });

        if (!actor) {
            throw new Error("System actor not found");
        }

        return actor;
    }
}


import { PrismaActorRepository } from "@calcom/features/booking-audit/lib/repository/PrismaActorRepository";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { type Container, createModule } from "../../di/di";

export const actorRepositoryModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.ACTOR_REPOSITORY;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.ACTOR_REPOSITORY_MODULE;
actorRepositoryModule.bind(token).toClass(PrismaActorRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
    token,
    loadModule: function (container: Container) {
        container.load(moduleToken, actorRepositoryModule);
    },
};

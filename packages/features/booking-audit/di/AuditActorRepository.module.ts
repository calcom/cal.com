import { KyselyAuditActorRepository } from "@calcom/features/booking-audit/lib/repository/KyselyAuditActorRepository";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { bindModuleToClassOnToken } from "@calcom/features/di/di";
import { moduleLoader as kyselyModuleLoader } from "@calcom/features/di/modules/Kysely";
import { createModule } from "../../di/di";

export const auditActorRepositoryModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.AUDIT_ACTOR_REPOSITORY;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.AUDIT_ACTOR_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
    module: auditActorRepositoryModule,
    moduleToken,
    token,
    classs: KyselyAuditActorRepository,
    depsMap: {
        kyselyRead: kyselyModuleLoader,
        kyselyWrite: kyselyModuleLoader,
    },
});

export const moduleLoader = {
    token,
    loadModule,
};


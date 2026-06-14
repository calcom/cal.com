import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";

const thisModule = createModule()
const token = DI_TOKENS.USER_REPOSITORY
const moduleToken = DI_TOKENS.USER_REPOSITORY_MODULE

const loadModule  = bindModuleToClassOnToken({
    module: thisModule,
    moduleToken,
    token,
    classs: UserRepository,
    dep: prismaModuleLoader
})

export const moduleLoader: ModuleLoader = {
    token,
    loadModule
}

export type { UserRepository }
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { type Container, createModule, type ModuleLoader } from "../di";

export const eventTypeRepositoryModule = createModule();
const token = DI_TOKENS.EVENT_TYPE_REPOSITORY;
const moduleToken = DI_TOKENS.EVENT_TYPE_REPOSITORY_MODULE;
eventTypeRepositoryModule.bind(token).toClass(EventTypeRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, eventTypeRepositoryModule);
  },
} satisfies ModuleLoader;

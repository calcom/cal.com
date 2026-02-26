import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import type { Container } from "@evyweb/ioctopus";
import { DefaultAdapterFactory } from "../adapters/AdaptersFactory";
import { CALENDAR_SUBSCRIPTION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_SUBSCRIPTION_DI_TOKENS.DEFAULT_ADAPTER_FACTORY;
const moduleToken = CALENDAR_SUBSCRIPTION_DI_TOKENS.DEFAULT_ADAPTER_FACTORY_MODULE;

thisModule.bind(token).toFactory(() => new DefaultAdapterFactory(), "singleton");

const loadModule = (container: Container): void => {
  container.load(moduleToken, thisModule);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { DefaultAdapterFactory };

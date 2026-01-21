import { AvailabilityCalculatorFactory } from "@calcom/features/bookings/lib/service/availability";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as luckyUserServiceModuleLoader } from "@calcom/features/di/modules/LuckyUser";
import { DI_TOKENS } from "@calcom/features/di/tokens";

const thisModule = createModule();
const token = DI_TOKENS.AVAILABILITY_CALCULATOR_FACTORY;
const moduleToken = DI_TOKENS.AVAILABILITY_CALCULATOR_FACTORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AvailabilityCalculatorFactory,
  depsMap: {
    luckyUserService: luckyUserServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export type { AvailabilityCalculatorFactory } from "@calcom/features/bookings/lib/service/availability";

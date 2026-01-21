import { createContainer } from "@calcom/features/di/di";
import type { AvailabilityCalculatorFactory } from "./AvailabilityCalculatorFactory.module";
import { moduleLoader as availabilityCalculatorFactoryModuleLoader } from "./AvailabilityCalculatorFactory.module";

const availabilityCalculatorFactoryContainer = createContainer();

export function getAvailabilityCalculatorFactory(): AvailabilityCalculatorFactory {
  availabilityCalculatorFactoryModuleLoader.loadModule(availabilityCalculatorFactoryContainer);
  return availabilityCalculatorFactoryContainer.get<AvailabilityCalculatorFactory>(
    availabilityCalculatorFactoryModuleLoader.token
  );
}

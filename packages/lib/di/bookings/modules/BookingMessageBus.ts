// eslint-disable-next-line no-restricted-imports
import { BookingMessageBus } from "@calcom/features/bookings/lib/messageBus/BookingMessageBus";

import { createModule, type Container, bindModuleToClassOnToken } from "../../di";
import { DI_TOKENS } from "../../tokens";

export const bookingMessageBusModule = createModule();
const token = DI_TOKENS.BOOKING_MESSAGE_BUS;
const moduleToken = DI_TOKENS.BOOKING_MESSAGE_BUS_MODULE;

bindModuleToClassOnToken({
  module: bookingMessageBusModule,
  token,
  classs: BookingMessageBus,
  depsMap: {},
  moduleToken,
});

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, bookingMessageBusModule);
  },
};

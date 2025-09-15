import { BookingMessageBus } from "@calcom/features/bookings/lib/messageBus/BookingMessageBus";

import { createModule, type Container } from "../../di";
import { DI_TOKENS } from "../../tokens";

export const bookingMessageBusModule = createModule();
const token = DI_TOKENS.BOOKING_MESSAGE_BUS;
const moduleToken = DI_TOKENS.BOOKING_MESSAGE_BUS_MODULE;

bookingMessageBusModule.bind(token).toClass(BookingMessageBus);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, bookingMessageBusModule);
  },
};

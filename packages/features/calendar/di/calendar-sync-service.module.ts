import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { type Container, createModule, type ModuleLoader } from "@calcom/features/di/di";
import prisma from "@calcom/prisma";
import { DefaultBookingSyncHandler } from "../services/booking-sync-handler";
import { CalendarSyncService } from "../services/calendar-sync-service";
import { CALENDAR_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_DI_TOKENS.CALENDAR_V2_SYNC_SERVICE;
const moduleToken = CALENDAR_DI_TOKENS.CALENDAR_V2_SYNC_SERVICE_MODULE;

thisModule.bind(token).toFactory(() => {
  const bookingRepository = new BookingRepository(prisma);
  const bookingHandler = new DefaultBookingSyncHandler(bookingRepository);
  return new CalendarSyncService({ bookingHandler });
});

function loadModule(container: Container) {
  container.load(moduleToken, thisModule);
}

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CalendarSyncService };

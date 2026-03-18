import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as bookingAccessServiceModuleLoader } from "@calcom/features/di/modules/BookingAccessService";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { BookingReportService } from "../services/BookingReportService";
import { moduleLoader as bookingReportRepositoryModuleLoader } from "./PrismaBookingReportRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_REPORT_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_REPORT_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingReportService,
  depsMap: {
    bookingRepo: bookingRepositoryModuleLoader,
    bookingReportRepo: bookingReportRepositoryModuleLoader,
    bookingAccessService: bookingAccessServiceModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { BookingReportService };

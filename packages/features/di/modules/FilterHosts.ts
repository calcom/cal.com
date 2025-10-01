import type { IFilterHostsService } from "../../bookings/filterHostsBySameRoundRobinHost";
import { FilterHostsService } from "../../bookings/filterHostsBySameRoundRobinHost";
import { createModule } from "../di";
import { DI_TOKENS } from "../tokens";

export const filterHostsModule = createModule();
filterHostsModule.bind(DI_TOKENS.FILTER_HOSTS_SERVICE).toClass(FilterHostsService, {
  bookingRepo: DI_TOKENS.BOOKING_REPOSITORY,
} satisfies Record<keyof IFilterHostsService, symbol>);

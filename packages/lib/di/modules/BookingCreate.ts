import { createModule } from "@evyweb/ioctopus";

import { BookingCreateService } from "@calcom/lib/server/service/booking/BookingCreateService";

import { DI_TOKENS } from "../tokens";

export const bookingCreateModule = createModule(DI_TOKENS.BOOKING_CREATE_SERVICE, BookingCreateService);
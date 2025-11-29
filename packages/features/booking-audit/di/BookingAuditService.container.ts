import { createContainer } from "@calcom/features/di/di";

import {
    type BookingAuditService,
    moduleLoader as bookingAuditServiceModule,
} from "./BookingAuditService.module";

const container = createContainer();

export function getBookingAuditService() {
    bookingAuditServiceModule.loadModule(container);

    return container.get<BookingAuditService>(bookingAuditServiceModule.token);
}


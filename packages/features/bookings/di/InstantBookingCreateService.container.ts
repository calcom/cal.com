import { createContainer } from "@calcom/features/di/di";

import {
  type InstantBookingCreateService,
  moduleLoader as instantBookingCreateServiceModule,
} from "./InstantBookingCreateService.module";

const container = createContainer();

export function getInstantBookingCreateService(): InstantBookingCreateService {
  instantBookingCreateServiceModule.loadModule(container);
  return container.get<InstantBookingCreateService>(instantBookingCreateServiceModule.token);
}

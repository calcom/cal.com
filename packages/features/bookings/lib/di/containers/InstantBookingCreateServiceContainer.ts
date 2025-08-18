import { createContainer } from "@evyweb/ioctopus";

import type { InstantBookingCreateService } from "../modules/InstantBookingCreateServiceModule";
import {
  loadModule as loadInstantBookingCreateServiceModule,
  token as instantBookingCreateServiceToken,
} from "../modules/InstantBookingCreateServiceModule";

const container = createContainer();

export function getInstantBookingCreateService(): InstantBookingCreateService {
  loadInstantBookingCreateServiceModule(container);
  return container.get<InstantBookingCreateService>(instantBookingCreateServiceToken);
}

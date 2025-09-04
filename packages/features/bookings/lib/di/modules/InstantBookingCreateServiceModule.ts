import type { Container } from "@evyweb/ioctopus";
import { createModule } from "@evyweb/ioctopus";

import { InstantBookingCreateService } from "@calcom/features/instant-meeting/handleInstantMeeting";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

export const instantBookingCreateServiceModule = createModule();
const token = DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE;
const moduleToken = DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE_MODULE;
instantBookingCreateServiceModule.bind(token).toClass(InstantBookingCreateService);
function loadModule(container: Container) {
  container.load(moduleToken, instantBookingCreateServiceModule);
}
export { loadModule, token };
export type { InstantBookingCreateService };

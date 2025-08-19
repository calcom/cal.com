import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { LuckyUserService } from "../../../../apps/api/v2/src/lib/services/lucky-user.service";

export const luckyUserServiceModule = createModule();
luckyUserServiceModule.bind(DI_TOKENS.LUCKY_USER_SERVICE).toClass(LuckyUserService, {
  bookingRepository: DI_TOKENS.BOOKING_REPOSITORY,
  hostRepository: DI_TOKENS.HOST_REPOSITORY,
  oooRepository: DI_TOKENS.OOO_REPOSITORY,
  userRepository: DI_TOKENS.USER_REPOSITORY,
  attributeRepository: DI_TOKENS.ATTRIBUTE_REPOSITORY,
});

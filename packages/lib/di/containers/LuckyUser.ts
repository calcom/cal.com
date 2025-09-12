import { DI_TOKENS } from "@calcom/lib/di/tokens";
import type { LuckyUserService } from "@calcom/lib/server/getLuckyUser";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { createContainer } from "../di";
import { attributeRepositoryModule } from "../modules/Attribute";
import { bookingRepositoryModule } from "../modules/Booking";
import { hostRepositoryModule } from "../modules/Host";
import { luckyUserServiceModule } from "../modules/LuckyUser";
import { oooRepositoryModule } from "../modules/Ooo";
import { userRepositoryModule } from "../modules/User";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.HOST_REPOSITORY_MODULE, hostRepositoryModule);
container.load(DI_TOKENS.OOO_REPOSITORY_MODULE, oooRepositoryModule);
container.load(DI_TOKENS.USER_REPOSITORY_MODULE, userRepositoryModule);
container.load(DI_TOKENS.ATTRIBUTE_REPOSITORY_MODULE, attributeRepositoryModule);
container.load(DI_TOKENS.LUCKY_USER_SERVICE_MODULE, luckyUserServiceModule);

export function getLuckyUserService() {
  return container.get<LuckyUserService>(DI_TOKENS.LUCKY_USER_SERVICE);
}

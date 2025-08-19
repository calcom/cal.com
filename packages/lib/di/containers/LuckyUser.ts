import { container } from "tsyringe";

import type { LuckyUserService } from "../../../../apps/api/v2/src/lib/services/lucky-user.service";
import { DI_TOKENS } from "../tokens";

export function getLuckyUserService(): LuckyUserService {
  return container.resolve(DI_TOKENS.LUCKY_USER_SERVICE);
}

import { createModule } from "@evyweb/ioctopus";

import { TaskerProvider } from "../../provider/TaskerProvider";
import { WEBHOOK_DI_TOKENS } from "../tokens";

export const infrastructureModule = createModule();

infrastructureModule.bind(WEBHOOK_DI_TOKENS.TASKER).toFunction(() => TaskerProvider.load());

import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { handleQueuedFormResponseCleanup } from "@calcom/app-store/routing-forms/cron/queuedFormResponseCleanup";

export const POST = defaultResponderForAppDir(handleQueuedFormResponseCleanup);

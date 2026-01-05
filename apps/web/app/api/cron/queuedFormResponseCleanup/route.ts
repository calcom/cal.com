import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { handleQueuedFormResponseCleanup } from "@calcom/app-store/apps/routing-forms/cron/queuedFormResponseCleanup";

export const GET = defaultResponderForAppDir(handleQueuedFormResponseCleanup);

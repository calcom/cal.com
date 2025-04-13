import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { handler } from "@calcom/features/ee/workflows/api/scheduleWhatsappReminders";

export const POST = defaultResponderForAppDir(handler);

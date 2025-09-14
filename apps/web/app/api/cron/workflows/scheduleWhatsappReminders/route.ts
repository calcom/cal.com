import { POST as handler } from "@calid/features/modules/workflows/api/cron/queueWhatsappReminder";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const POST = defaultResponderForAppDir(handler);

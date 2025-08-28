import { POST as handler } from "@calid/features/modules/workflows/cron/queueWhatsappReminder";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const POST = defaultResponderForAppDir(handler);

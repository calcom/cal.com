import { POST as handler } from "@calid/features/workflows/cron/queueWhatsappReminder";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const POST = defaultResponderForAppDir(handler);

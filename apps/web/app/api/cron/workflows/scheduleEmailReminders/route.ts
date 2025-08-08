import { POST as handler } from "@calid/features/workflows/cron/queueEmailReminder";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const POST = defaultResponderForAppDir(handler);

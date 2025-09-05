import { handler } from "@calcom/features/ee/workflows/api/scheduleWhatsappReminders";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const POST = defaultResponderForAppDir(handler);

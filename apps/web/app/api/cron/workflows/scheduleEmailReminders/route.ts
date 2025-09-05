import { handler } from "@calcom/features/ee/workflows/api/scheduleEmailReminders";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const POST = defaultResponderForAppDir(handler);

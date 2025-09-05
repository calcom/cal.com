import { GET as handler } from "@calcom/features/tasker/api/cleanup";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const GET = defaultResponderForAppDir(handler);

import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { GET as handler } from "@calcom/features/tasker/api/cleanup";

export const GET = defaultResponderForAppDir(handler);

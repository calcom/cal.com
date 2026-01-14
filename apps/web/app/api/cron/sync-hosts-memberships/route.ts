import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { handleSyncHostsMemberships } from "@calcom/features/eventtypes/cron/syncHostsMemberships";

export const GET = defaultResponderForAppDir(handleSyncHostsMemberships);

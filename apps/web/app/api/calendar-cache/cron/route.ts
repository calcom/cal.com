import { handler } from "@calcom/features/calendar-cache/api/cron";
import { withMultiTenantPrisma } from "@calcom/prisma/store/withMultiTenantPrisma";

import { defaultResponderForAppDir } from "../../defaultResponderForAppDir";

export const GET = withMultiTenantPrisma(defaultResponderForAppDir(handler));

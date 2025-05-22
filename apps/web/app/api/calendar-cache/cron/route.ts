import { handler } from "@calcom/features/calendar-cache/api/cron";
import { withMultiTenantPrisma } from "@calcom/prisma/store/withPrismaClient";

import { defaultResponderForAppDir } from "../../defaultResponderForAppDir";

export const GET = withMultiTenantPrisma(defaultResponderForAppDir(handler));

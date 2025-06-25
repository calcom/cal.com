import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { GET as handler } from "@calcom/features/tasker/api/cron";
import { withMultiTenantPrisma } from "@calcom/prisma/store/withMultiTenantPrisma";

export const GET = withMultiTenantPrisma(defaultResponderForAppDir(handler, { disableTenantPrisma: true }));

/**
 * This runs each minute and we need fresh data each time
 * @see https://nextjs.org/docs/app/building-your-application/caching#opting-out-2
 **/
export const revalidate = 0;

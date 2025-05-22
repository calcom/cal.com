import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { GET as handler } from "@calcom/features/tasker/api/cleanup";
import { withMultiTenantPrisma } from "@calcom/prisma/store/withPrismaClient";

export const GET = withMultiTenantPrisma(defaultResponderForAppDir(handler));

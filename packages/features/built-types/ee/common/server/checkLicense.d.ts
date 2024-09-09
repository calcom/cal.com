import type { PrismaClient } from "@calcom/prisma";
declare function checkLicense(
/** The prisma client to use (necessary for public API to handle custom prisma instances) */
prisma: PrismaClient): Promise<boolean>;
export default checkLicense;
//# sourceMappingURL=checkLicense.d.ts.map
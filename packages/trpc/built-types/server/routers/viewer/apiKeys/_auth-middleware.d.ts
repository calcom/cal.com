import type { Prisma } from "@prisma/client";
export declare function checkPermissions(args: {
    userId: number;
    teamId?: number;
    role: Prisma.MembershipWhereInput["role"];
}): Promise<void>;

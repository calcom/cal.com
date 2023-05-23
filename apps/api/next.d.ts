import type { Session } from "next-auth";
import type { NextApiRequest as BaseNextApiRequest } from "next/types";

import type { PrismaClient } from "@calcom/prisma/client";

export type * from "next/types";

export declare module "next" {
  interface NextApiRequest extends BaseNextApiRequest {
    session?: Session | null;

    userId: number;
    method: string;
    prisma: PrismaClient;
    // session: { user: { id: number } };
    // query: Partial<{ [key: string]: string | string[] }>;
    isAdmin: boolean;
    isCustomPrisma: boolean;
    pagination: { take: number; skip: number };
  }
}

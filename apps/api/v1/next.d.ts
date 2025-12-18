import type { Session } from "next-auth";
import type { NextApiRequest as BaseNextApiRequest } from "next/types";

export type * from "next/types";

export declare module "next" {
  interface NextApiRequest extends BaseNextApiRequest {
    session?: Session | null;

    userId: number;
    user?: { uuid: string; role: string; locked: boolean; email: string } | null;
    method: string;
    // session: { user: { id: number } };
    // query: Partial<{ [key: string]: string | string[] }>;
    isSystemWideAdmin: boolean;
    isOrganizationOwnerOrAdmin: boolean;
    pagination: { take: number; skip: number };
  }
}

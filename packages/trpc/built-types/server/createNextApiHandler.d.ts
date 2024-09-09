import type { AnyRouter } from "@trpc/server";
/**
 * Creates an API handler executed by Next.js.
 */
export declare function createNextApiHandler(router: AnyRouter, isPublic?: boolean, namespace?: string): import("@trpc/server/adapters/next").NextApiHandler<any>;

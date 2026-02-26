import type { PrismaClient } from "../generated/prisma/client";

type ClientResolver = (defaultClient: PrismaClient) => PrismaClient;

let resolver: ClientResolver | undefined;

export const tenantContext = {
  setResolver(fn: ClientResolver): void {
    resolver = fn;
  },

  resolve(defaultClient: PrismaClient): PrismaClient {
    return resolver ? resolver(defaultClient) : defaultClient;
  },
};

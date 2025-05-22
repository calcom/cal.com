import { PrismockClient } from "prismock";
import { beforeEach, vi } from "vitest";

import logger from "@calcom/lib/logger";
import * as selects from "@calcom/prisma/selects";
import { Tenant } from "@calcom/prisma/store/tenants";

const createPrismaMock = () => {
  const prismock = new PrismockClient();
  
  return new Proxy(prismock, {
    get(target: any, prop: string | symbol) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        return undefined;
      }
      
      return target[prop];
    }
  });
};

const prismock = new PrismockClient();
const prisma = createPrismaMock();

vi.mock("@calcom/prisma", () => {
  function runWithTenants(tenant: Tenant, fn: () => any): any {
    if (typeof fn === "function") {
      return fn();
    }
    return null;
  };
  
  const getTenantAwarePrisma = () => prisma;
  
  const getPrisma = () => prisma;
  
  return {
    default: prisma,
    prisma,
    readonlyPrisma: prisma,
    ...selects,
    runWithTenants,
    getTenantAwarePrisma,
    getPrisma,
    Tenant,
  };
});

const handlePrismockBugs = () => {
  const __findManyWebhook = prismock.webhook.findMany;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.webhook.findMany = (...rest: any[]) => {
    // There is some bug in prismock where it can't handle complex where clauses
    if (rest[0].where?.OR && rest[0].where.AND) {
      rest[0].where = undefined;
      logger.silly("Fixed Prismock bug-2");
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return __findManyWebhook(...rest);
  };
  
  const __findManyMembership = prismock.membership.findMany;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.membership.findMany = ((...rest: any[]) => {
    if (rest[0]?.select?.createdAt) {
      delete rest[0].select.createdAt;
      logger.silly("Fixed Prismock bug - removed Membership.createdAt from select");
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = __findManyMembership(...rest);
    
    if (Array.isArray(result)) {
      return result.map((item) => ({
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }
    
    return result;
  }) as any;
};

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismock.reset();
  Object.keys(prisma).forEach((key) => {
    if (typeof prisma[key] === 'object' && prisma[key] !== null) {
      // @ts-ignore
      prisma[key] = prismock[key];
    }
  });
  handlePrismockBugs();
});

export default prisma;

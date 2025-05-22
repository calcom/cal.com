import { beforeEach, vi } from "vitest";
import { DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";

import type { PrismaClient } from "@calcom/prisma";
import { Tenant } from "@calcom/prisma/store/tenants";

const createPrismaMock = () => {
  const mockPrisma = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;
  
  return new Proxy(mockPrisma, {
    get(target: any, prop: string | symbol) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        return undefined;
      }
      
      return target[prop];
    }
  });
};

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
    availabilityUserSelect: vi.fn(),
    userSelect: vi.fn(),
    runWithTenants,
    getTenantAwarePrisma,
    getPrisma,
    Tenant,
  };
});

beforeEach(() => {
  mockReset(prisma);
});

export default prisma;

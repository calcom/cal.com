import { type DMMF } from "@prisma/client/runtime/client";
import { getDMMF } from "@prisma/internals";
import { readFileSync } from "fs";
import { beforeEach, vi } from "vitest";
import { createPrismock } from "prismock/build/main/lib/client";

import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import * as selects from "@calcom/prisma/selects";

vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/testdb");

const handlePrismockBugs = (prismock: any) => {
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
};

let prismockInstance: any;
const proxyTarget = {} as PrismaClient;

const prismaMockProxy = new Proxy(proxyTarget, {
  get(target, prop) {
    if (!prismockInstance) {
      throw new Error("Prismock not initialized yet");
    }
    if (prop in target) {
      return (target as any)[prop];
    }
    return prismockInstance[prop];
  },
  getOwnPropertyDescriptor(target, prop) {
    if (!prismockInstance) {
      return undefined;
    }
    const targetDescriptor = Object.getOwnPropertyDescriptor(target, prop);
    if (targetDescriptor) {
      return targetDescriptor;
    }
    return Object.getOwnPropertyDescriptor(prismockInstance, prop);
  },
  has(target, prop) {
    if (!prismockInstance) {
      return false;
    }
    if (prop in target) {
      return true;
    }
    return prop in prismockInstance;
  },
  ownKeys(target) {
    if (!prismockInstance) {
      return [];
    }
    return Reflect.ownKeys(prismockInstance);
  },
  set(target, prop, value) {
    if (!prismockInstance) {
      throw new Error("Prismock not initialized yet");
    }
    (target as any)[prop] = value;
    return true;
  }
});

vi.mock("@calcom/prisma", async (importOriginal) => {
  const original = await importOriginal<typeof import("@calcom/prisma/client")>();
  const { Prisma } = original;

  const schemaContent = readFileSync("packages/prisma/schema.prisma", "utf-8");
  const dmmf = await getDMMF({ datamodel: schemaContent });
  const PrismaWithDMMF = { ...Prisma, dmmf };

  const PrismockClientClass = createPrismock(
    PrismaWithDMMF as unknown as typeof Prisma & { dmmf: DMMF.Document }
  );
  
  prismockInstance = new PrismockClientClass();

  if (!prismockInstance.$queryRaw) {
    Object.defineProperty(prismockInstance, "$queryRaw", {
      value: async () => {
        throw new Error("$queryRaw is not implemented in prismock. Use vi.spyOn to mock it in your test.");
      },
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }

  return {
    default: prismaMockProxy,
    prisma: prismaMockProxy,
    readonlyPrisma: prismaMockProxy,
    ...selects,
  };
});

beforeEach(() => {
  if (prismockInstance) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    prismockInstance.reset();
    handlePrismockBugs(prismockInstance);
  }
});

export default prismaMockProxy;

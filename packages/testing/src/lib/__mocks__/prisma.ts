import { readFileSync } from "node:fs";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import * as selects from "@calcom/prisma/selects";
import type { DMMF } from "@prisma/client/runtime/client";
import { getDMMF } from "@prisma/internals";
import { createPrismock } from "prismock/build/main/lib/client";
import { beforeEach, vi } from "vitest";

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
  ownKeys(_target) {
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
  },
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

  {
    const originalQueryRaw = prismockInstance.$queryRaw?.bind(prismockInstance);
    Object.defineProperty(prismockInstance, "$queryRaw", {
      value: async (...args: unknown[]) => {
        const raw = String(args[0] ?? "");
        const sql = Array.isArray(args[0]) ? (args[0] as string[]).join("") : raw;
        // Fallback for getAllAcceptedTeamBookingsOfUsers raw UNION ALL query:
        // return all accepted bookings from prismock's in-memory store so
        // the post-filter step handles the rest.
        if (sql.includes("UNION ALL") && sql.includes("Booking") && sql.includes("Attendee")) {
          return prismockInstance.booking.findMany({
            where: { status: "ACCEPTED" },
            select: {
              id: true,
              uid: true,
              startTime: true,
              endTime: true,
              eventTypeId: true,
              title: true,
              userId: true,
            },
          });
        }
        if (originalQueryRaw) {
          return originalQueryRaw(...args);
        }
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
    prismockInstance.reset();
    handlePrismockBugs(prismockInstance);
  }
});

export default prismaMockProxy;

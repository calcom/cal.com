import { createPrismock } from "prismock";
import { beforeEach, vi } from "vitest";

import logger from "@calcom/lib/logger";
import * as selects from "@calcom/prisma/selects";

import { Prisma as PrismaType } from "@calcom/prisma/client";

vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/testdb");

vi.mock("@calcom/prisma", () => ({
  default: prismaMock,
  prisma: prismaMock,
  readonlyPrisma: prismaMock,
  ...selects,
}));

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
};

const PrismockClientConstructor = createPrismock(PrismaType);
const prismock = new PrismockClientConstructor();

const prismaMock = prismock;

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismock.reset();
  handlePrismockBugs();
});

export default prismaMock;

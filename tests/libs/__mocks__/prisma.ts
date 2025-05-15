import { PrismockClientClass } from "prismock";
import { beforeEach, vi } from "vitest";

import logger from "@calcom/lib/logger";
import { Prisma } from "@calcom/prisma/client";
import * as selects from "@calcom/prisma/selects";

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
  readonlyPrisma: prisma,
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

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismock.reset();
  handlePrismockBugs();
});

const ActualPrismockClientConstructor = PrismockClientClass({ dmmf: Prisma.dmmf });
const prismock = new ActualPrismockClientConstructor();

const prisma = prismock;
export default prisma;

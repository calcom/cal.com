import { PrismockClient } from "prismock";
import { beforeEach, vi } from "vitest";

import logger from "@calcom/lib/logger";
import * as selects from "@calcom/prisma/selects";

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
  ...selects,
}));

const handlePrismockBugs = () => {
  const __updateBooking = prismock.booking.update;
  const __findFirstOrThrowBooking = prismock.booking.findFirstOrThrow;
  const __findManyWebhook = prismock.webhook.findMany;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.booking.update = (...rest: any[]) => {
    // There is a bug in prismock where it considers `createMany` and `create` itself to have the data directly
    // In booking flows, we encounter such scenario, so let's fix that here directly till it's fixed in prismock
    if (rest[0].data.references?.createMany) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      rest[0].data.references.createMany = rest[0].data.references?.createMany.data;
      logger.silly("Fixed Prismock bug");
    }
    if (rest[0].data.references?.create) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      rest[0].data.references.create = rest[0].data.references?.create.data;
      logger.silly("Fixed Prismock bug-1");
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return __updateBooking(...rest);
  };

  prismock.booking.findFirstOrThrow = (...rest: any[]) => {
    const { where } = rest[0];
    delete where.NOT;
    logger.silly("Fixed Prismock bug with using NOT in where clause");

    return __findFirstOrThrowBooking(...rest);
  };

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

const prismock = new PrismockClient();

const prisma = prismock;
export default prisma;

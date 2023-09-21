import { PrismockClient } from "prismock";
import { beforeEach, vi } from "vitest";

import logger from "@calcom/lib/logger";
import * as selects from "@calcom/prisma/selects";

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
  ...selects,
}));

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismock.reset();
  const __update = prismock.booking.update;
  prismock.booking.update = (...rest) => {
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
      logger.silly("Fixed Prismock bug");
    }

    return __update(...rest);
  };
});

const prismock = new PrismockClient();

const prisma = prismock;
export default prisma;

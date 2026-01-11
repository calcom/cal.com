import { beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import type { PrismaClient } from "@calcom/prisma";

beforeEach(() => {
  mockReset(prisma);
});

const prisma = mockDeep<PrismaClient>();
export { prisma };

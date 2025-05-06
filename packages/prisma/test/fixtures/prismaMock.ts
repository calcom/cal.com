import { beforeEach } from "vitest";
import type { DeepMockProxy } from "vitest-mock-extended";
import { mockDeep, mockReset } from "vitest-mock-extended";

import type { PrismaClient } from "@calcom/prisma";

const prisma = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prisma);
});

export default prisma;

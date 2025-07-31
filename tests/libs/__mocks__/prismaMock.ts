import { beforeEach, vi } from "vitest";
import { DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";

import type { PrismaClient } from "@calcom/prisma";

const prisma = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
  availabilityUserSelect: vi.fn(),
  userSelect: vi.fn(),
}));

beforeEach(() => {
  mockReset(prisma);
});

export default prisma;

import { beforeEach, vi } from "vitest";
import { DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";

import type { PrismaClient } from "@calcom/prisma";

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
  availabilityUserSelect: vi.fn(),
  userSelect: vi.fn(),
}));

beforeEach(() => {
  mockReset(prisma);
});

const prisma = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;
export default prisma;

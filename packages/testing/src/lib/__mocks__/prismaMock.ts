import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, vi } from "vitest";
import { type DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";

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

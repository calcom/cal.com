import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import type { PrismaClient, PrismaClientForTesting } from "@calcom/prisma";

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
  availabilityUserSelect: vi.fn(),
  userSelect: vi.fn(),
}));

beforeEach(() => {
  mockReset(prisma);
});

const prisma = mockDeep<PrismaClient>();
const prismaWithoutAccelerate = mockDeep<PrismaClientForTesting>();

export { prismaWithoutAccelerate };
export default prisma;

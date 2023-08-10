import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import type { PrismaType } from "@calcom/prisma";

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  availabilityUserSelect: vi.fn(),
  userSelect: vi.fn(),
}));

beforeEach(() => {
  mockReset(prisma);
});

const prisma = mockDeep<PrismaType>();
export default prisma;

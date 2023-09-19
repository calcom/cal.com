import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import type { PrismaClient } from "@calcom/prisma";
import * as selects from "@calcom/prisma/selects";

// Explore using https://github.com/morintd/prismock
vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
  ...selects,
}));

beforeEach(() => {
  mockReset(prisma);
});

// const prisma = mockDeep<PrismaClient>(
// Ensure that all unit tests properly mock the prisma calls that are needed and then enforce this, so that accidental DB queries don't occur
// {
//   fallbackMockImplementation: () => {
//     throw new Error("Unimplemented");
//   },
// }
// );
const prisma = mockDeep<PrismaClient>();
export default prisma;

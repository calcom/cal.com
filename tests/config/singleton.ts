import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

import * as CalendarManager from "@calcom/core/CalendarManager";
import prisma from "@calcom/prisma";

jest.mock("@calcom/core/CalendarManager");

jest.mock("@calcom/prisma", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

beforeEach(() => {
  mockReset(prismaMock);
});

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
export const CalendarManagerMock = CalendarManager as unknown as DeepMockProxy<typeof CalendarManager>;

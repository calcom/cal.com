import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as appStore from "@calcom/app-store";

vi.mock("@calcom/app-store", () => appStoreMock);

beforeEach(() => {
  mockReset(appStoreMock);
});

const appStoreMock = mockDeep<typeof appStore>({
  fallbackMockImplementation: () => {
    throw new Error("Unimplemented");
  },
});
export default appStoreMock;

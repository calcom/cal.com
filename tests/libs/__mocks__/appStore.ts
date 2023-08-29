import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as appStore from "@calcom/app-store";

vi.mock("@calcom/core/appStore", () => appStoreMock);

beforeEach(() => {
  mockReset(appStoreMock);
});

const appStoreMock = mockDeep<typeof appStore>();
export default appStoreMock;

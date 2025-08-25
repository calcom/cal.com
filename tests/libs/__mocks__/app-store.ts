import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";

import type * as appStore from "@calcom/app-store";

import { mockDeepHelper } from "./mockDeepHelper";

const appStoreMock = mockDeepHelper<typeof appStore>("appStoreMock");

vi.mock("@calcom/app-store", () => appStoreMock);

beforeEach(() => {
  mockReset(appStoreMock);
});

export default appStoreMock;

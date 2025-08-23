import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";

import type * as paymentLoaders from "@calcom/app-store/_utils/payments/paymentLoaders";

import { mockDeepHelper } from "./mockDeepHelper";

const paymentLoadersMock = mockDeepHelper<typeof paymentLoaders>("paymentLoadersMock");

vi.mock("@calcom/app-store/_utils/payments/paymentLoaders", () => paymentLoadersMock);

beforeEach(() => {
  mockReset(paymentLoadersMock);
});

export default paymentLoadersMock;

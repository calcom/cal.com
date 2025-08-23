import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";

import type * as paymentLoaders from "@calcom/app-store/_utils/payments/paymentLoaders";

import { mockDeepHelper } from "./mockDeepHelper";

const paymentAppsMock = mockDeepHelper<typeof paymentLoaders>("paymentAppsMock");

vi.mock("@calcom/app-store/_utils/payments/paymentLoaders", () => paymentAppsMock);

beforeEach(() => {
  mockReset(paymentAppsMock);
});

export default paymentAppsMock;

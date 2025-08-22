import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as paymentLoaders from "@calcom/app-store/_utils/payments/paymentLoaders";

vi.mock("@calcom/app-store/_utils/payments/paymentLoaders", () => paymentAppsMock);

beforeEach(() => {
  mockReset(paymentAppsMock);
});

const paymentAppsMock = mockDeep<typeof paymentLoaders>({
  fallbackMockImplementation: () => {
    throw new Error(
      "Unimplemented paymentAppsMock. You seem to have not mocked the app that you are trying to use"
    );
  },
});

export default paymentAppsMock;

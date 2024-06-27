import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as checkRateLimitAndThrowError from "@calcom/lib/checkRateLimitAndThrowError";

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => checkRateLimitAndThrowErrorMock);

beforeEach(() => {
  mockReset(checkRateLimitAndThrowErrorMock);
});

const checkRateLimitAndThrowErrorMock = mockDeep<typeof checkRateLimitAndThrowError>();

export const scenarios = {
  fakeRateLimitPassed: () => {
    // It doesn't matter what the implementation is, as long as it resolves without error
    checkRateLimitAndThrowErrorMock.checkRateLimitAndThrowError.mockResolvedValue(undefined);
  },
  fakeRateLimitFailed: () => {
    const error = new Error("FAKE_RATE_LIMIT_ERROR");
    // It doesn't matter what the implementation is, as long as it resolves without error
    checkRateLimitAndThrowErrorMock.checkRateLimitAndThrowError.mockImplementation(() => {
      throw error;
    });
    return error.message;
  },
};

export default checkRateLimitAndThrowErrorMock;

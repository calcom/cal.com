import type * as checkRateLimitAndThrowError from "@calcom/lib/checkRateLimitAndThrowError";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => checkRateLimitAndThrowErrorMock);

beforeEach(() => {
  mockReset(checkRateLimitAndThrowErrorMock);
});

const checkRateLimitAndThrowErrorMock = mockDeep<typeof checkRateLimitAndThrowError>();

export const scenarios = {
  fakeRateLimitPassed: () => {
    // It doesn't matter what the implementation is, as long as it resolves without error
    checkRateLimitAndThrowErrorMock.checkRateLimitAndThrowError.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 999,
      reset: 0,
    });
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

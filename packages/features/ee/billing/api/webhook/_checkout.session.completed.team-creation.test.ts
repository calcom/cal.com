import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";
import handler from "./_checkout.session.completed.team-creation";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
    }),
  },
}));

describe("checkout.session.completed.team-creation webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success message for valid session data", async () => {
    const data = {
      object: {
        id: "cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
        metadata: {
          teamName: "Test Team",
          teamSlug: "test-team",
        },
      },
    } as unknown as SWHMap["checkout.session.completed"]["data"];

    const result = await handler(data);

    expect(result).toEqual({
      success: true,
      message: "Team checkout handled via redirect",
    });
  });

  it("returns success message for session without metadata", async () => {
    const data = {
      object: {
        id: "cs_test_no_metadata",
        metadata: null,
      },
    } as unknown as SWHMap["checkout.session.completed"]["data"];

    const result = await handler(data);

    expect(result).toEqual({
      success: true,
      message: "Team checkout handled via redirect",
    });
  });

  it("returns success message for session with empty metadata", async () => {
    const data = {
      object: {
        id: "cs_test_empty_metadata",
        metadata: {},
      },
    } as unknown as SWHMap["checkout.session.completed"]["data"];

    const result = await handler(data);

    expect(result).toEqual({
      success: true,
      message: "Team checkout handled via redirect",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExecute = vi.fn();

vi.mock("@calcom/features/admin/di/container", () => ({
  getLockUserAccountAction: () => ({ execute: mockExecute }),
}));

vi.mock("@calcom/features/admin/actions/observable-admin-action", () => ({
  ObservableAdminAction: class {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private inner: any) {}
    execute(input: unknown) {
      return this.inner.execute(input);
    }
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import lockUserAccountHandler from "./lockUserAccount.handler";

describe("lockUserAccountHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: null,
    profile: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delegate to the action and return the result", async () => {
    mockExecute.mockResolvedValue({ success: true, userId: 42, locked: true });

    const result = await lockUserAccountHandler({
      ctx: { user: mockUser as never },
      input: { userId: 42, locked: true },
    });

    expect(mockExecute).toHaveBeenCalledWith({ userId: 42, locked: true });
    expect(result).toEqual({ success: true, userId: 42, locked: true });
  });

  it("should pass the input through to the action for unlock", async () => {
    mockExecute.mockResolvedValue({ success: true, userId: 42, locked: false });

    const result = await lockUserAccountHandler({
      ctx: { user: mockUser as never },
      input: { userId: 42, locked: false },
    });

    expect(mockExecute).toHaveBeenCalledWith({ userId: 42, locked: false });
    expect(result).toEqual({ success: true, userId: 42, locked: false });
  });

  it("should propagate errors from the action", async () => {
    mockExecute.mockRejectedValue(new Error("User not found"));

    await expect(
      lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 99, locked: true },
      })
    ).rejects.toThrow("User not found");
  });
});

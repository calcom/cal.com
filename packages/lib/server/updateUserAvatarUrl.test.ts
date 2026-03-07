import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateMany = vi.fn();

vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

import { updateUserAvatarUrl } from "./updateUserAvatarUrl";

describe("updateUserAvatarUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("calls updateMany with correct where clause requiring null avatarUrl", async () => {
    await updateUserAvatarUrl({ id: 42, avatarUrl: "/api/avatar/abc.png" });

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 42,
        avatarUrl: { equals: null },
      },
      data: { avatarUrl: "/api/avatar/abc.png" },
    });
  });

  it("passes avatarUrl unchanged", async () => {
    const url = "https://example.com/photo.jpg";
    await updateUserAvatarUrl({ id: 1, avatarUrl: url });

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { avatarUrl: url },
      })
    );
  });

  it("returns undefined (void)", async () => {
    const result = await updateUserAvatarUrl({ id: 1, avatarUrl: "/test.png" });
    expect(result).toBeUndefined();
  });

  it("propagates prisma errors", async () => {
    mockUpdateMany.mockRejectedValue(new Error("DB connection failed"));

    await expect(updateUserAvatarUrl({ id: 1, avatarUrl: "/test.png" })).rejects.toThrow(
      "DB connection failed"
    );
  });

  it("uses the provided user id in the where clause", async () => {
    await updateUserAvatarUrl({ id: 999, avatarUrl: "/photo.png" });

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 999 }),
      })
    );
  });
});

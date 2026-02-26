import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpsert = vi.fn();

vi.mock("uuid", () => ({
  v4: () => "mock-uuid-1234",
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    avatar: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

vi.mock("./imageUtils", () => ({
  convertSvgToPng: vi.fn((data: string) => Promise.resolve(`processed:${data}`)),
}));

import { uploadAvatar, uploadLogo } from "./avatar";

describe("uploadAvatar", () => {
  beforeEach(() => {
    mockUpsert.mockReset();
    mockUpsert.mockResolvedValue({});
  });

  it("returns avatar URL with UUID", async () => {
    const result = await uploadAvatar({ userId: 1, avatar: "data:image/png;base64,abc" });
    expect(result).toBe("/api/avatar/mock-uuid-1234.png");
  });

  it("upserts avatar with correct where clause", async () => {
    await uploadAvatar({ userId: 42, avatar: "avatar-data" });

    expect(mockUpsert).toHaveBeenCalledWith({
      where: {
        teamId_userId_isBanner: {
          teamId: 0,
          userId: 42,
          isBanner: false,
        },
      },
      create: {
        userId: 42,
        data: "processed:avatar-data",
        objectKey: "mock-uuid-1234",
        isBanner: false,
      },
      update: {
        data: "processed:avatar-data",
        objectKey: "mock-uuid-1234",
      },
    });
  });

  it("processes SVG data through convertSvgToPng", async () => {
    const { convertSvgToPng } = await import("./imageUtils");
    await uploadAvatar({ userId: 1, avatar: "svg-data" });

    expect(convertSvgToPng).toHaveBeenCalledWith("svg-data");
  });
});

describe("uploadLogo", () => {
  beforeEach(() => {
    mockUpsert.mockReset();
    mockUpsert.mockResolvedValue({});
  });

  it("returns logo URL with UUID", async () => {
    const result = await uploadLogo({ teamId: 5, logo: "logo-data" });
    expect(result).toBe("/api/avatar/mock-uuid-1234.png");
  });

  it("upserts logo with correct where clause for team", async () => {
    await uploadLogo({ teamId: 10, logo: "logo-data" });

    expect(mockUpsert).toHaveBeenCalledWith({
      where: {
        teamId_userId_isBanner: {
          teamId: 10,
          userId: 0,
          isBanner: false,
        },
      },
      create: {
        teamId: 10,
        data: "processed:logo-data",
        objectKey: "mock-uuid-1234",
        isBanner: false,
      },
      update: {
        data: "processed:logo-data",
        objectKey: "mock-uuid-1234",
      },
    });
  });

  it("passes isBanner flag through to upsert", async () => {
    await uploadLogo({ teamId: 7, logo: "banner-data", isBanner: true });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          teamId_userId_isBanner: {
            teamId: 7,
            userId: 0,
            isBanner: true,
          },
        },
        create: expect.objectContaining({ isBanner: true }),
      })
    );
  });

  it("defaults isBanner to false", async () => {
    await uploadLogo({ teamId: 1, logo: "data" });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          teamId_userId_isBanner: expect.objectContaining({ isBanner: false }),
        },
      })
    );
  });
});

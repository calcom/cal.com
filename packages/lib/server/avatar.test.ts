import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockUuidv4 = vi.fn();
const mockConvertSvgToPng = vi.fn();

vi.mock("uuid", () => ({
  v4: (...args: unknown[]) => mockUuidv4(...args),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    avatar: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

vi.mock("./imageUtils", () => ({
  convertSvgToPng: (...args: unknown[]) => mockConvertSvgToPng(...args),
}));

import { uploadAvatar, uploadLogo } from "./avatar";

describe("uploadAvatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConvertSvgToPng.mockImplementation((data: string) => Promise.resolve(`processed_${data}`));
    mockUpsert.mockResolvedValue(undefined);
    mockUuidv4.mockReturnValue("generated-uuid-1234");
  });

  it("always generates a new objectKey via uuidv4", async () => {
    const result = await uploadAvatar({ userId: 1, avatar: "image-data" });

    expect(mockUuidv4).toHaveBeenCalled();
    expect(result).toBe("/api/avatar/generated-uuid-1234.png");
  });

  it("includes objectKey in both create and update clauses for cache busting", async () => {
    await uploadAvatar({ userId: 1, avatar: "image-data" });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ objectKey: "generated-uuid-1234" }),
        update: expect.objectContaining({ objectKey: "generated-uuid-1234" }),
      })
    );
  });

  it("returns /api/avatar/{objectKey}.png", async () => {
    const result = await uploadAvatar({ userId: 5, avatar: "data" });

    expect(result).toBe("/api/avatar/generated-uuid-1234.png");
  });

  it("uses correct compound unique key for upsert", async () => {
    await uploadAvatar({ userId: 42, avatar: "data" });

    const expectedWhere = {
      teamId_userId_isBanner: { teamId: 0, userId: 42, isBanner: false },
    };

    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
  });

  it("does not look up existing avatar", async () => {
    await uploadAvatar({ userId: 1, avatar: "data" });

    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("calls convertSvgToPng on input data", async () => {
    mockFindUnique.mockResolvedValue(null);

    await uploadAvatar({ userId: 1, avatar: "svg-data-here" });

    expect(mockConvertSvgToPng).toHaveBeenCalledWith("svg-data-here");
  });

  it("passes processed data to upsert create and update", async () => {
    await uploadAvatar({ userId: 1, avatar: "raw-data" });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ data: "processed_raw-data" }),
        update: expect.objectContaining({ data: "processed_raw-data" }),
      })
    );
  });

  it("sets isBanner to false in create clause", async () => {
    await uploadAvatar({ userId: 1, avatar: "data" });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isBanner: false }),
      })
    );
  });
});

describe("uploadLogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUuidv4.mockReturnValue("mock-uuid-1234");
    mockConvertSvgToPng.mockImplementation((data: string) => Promise.resolve(`processed:${data}`));
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

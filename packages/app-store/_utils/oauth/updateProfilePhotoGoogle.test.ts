import { oauth2_v2 } from "@googleapis/oauth2";
import type { OAuth2Client } from "googleapis-common";
import { describe, it, expect, vi, beforeEach } from "vitest";

import logger from "@calcom/lib/logger";
import { UserRepository } from "@calcom/lib/server/repository/user";

import { updateProfilePhotoGoogle } from "./updateProfilePhotoGoogle";

vi.mock("@googleapis/oauth2", () => ({
  oauth2_v2: {
    Oauth2: vi.fn(),
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/repository/user", () => ({
  UserRepository: {
    updateAvatar: vi.fn(),
  },
}));

describe("updateProfilePhotoGoogle", () => {
  const mockOAuth2Client = {} as OAuth2Client;
  const userId = 123;
  let mockOauth2Instance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOauth2Instance = {
      userinfo: {
        get: vi.fn(),
      },
    };
    (oauth2_v2.Oauth2 as any).mockImplementation(() => mockOauth2Instance);
  });

  it("should update avatar with valid URL", async () => {
    const validUrl = "https://example.com/api/avatar.jpg";
    mockOauth2Instance.userinfo.get.mockResolvedValue({
      data: { picture: validUrl },
    });

    await updateProfilePhotoGoogle(mockOAuth2Client, userId);

    expect(UserRepository.updateAvatar).toHaveBeenCalledWith({
      id: userId,
      avatarUrl: validUrl,
    });
  });

  it("should skip processing for URLs that are too long", async () => {
    const longUrl = `https://example.com/${"a".repeat(10000)}`;
    mockOauth2Instance.userinfo.get.mockResolvedValue({
      data: { picture: longUrl },
    });

    await updateProfilePhotoGoogle(mockOAuth2Client, userId);

    expect(logger.warn).toHaveBeenCalledWith(
      `Avatar URL too long (${longUrl.length} characters), skipping processing for user ${userId}`
    );
    expect(UserRepository.updateAvatar).not.toHaveBeenCalled();
  });

  it("should do nothing when no picture provided", async () => {
    mockOauth2Instance.userinfo.get.mockResolvedValue({
      data: {},
    });

    await updateProfilePhotoGoogle(mockOAuth2Client, userId);

    expect(UserRepository.updateAvatar).not.toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    const error = new Error("OAuth API failed");
    mockOauth2Instance.userinfo.get.mockRejectedValue(error);

    await updateProfilePhotoGoogle(mockOAuth2Client, userId);

    expect(logger.error).toHaveBeenCalledWith("Error updating avatarUrl from google calendar connect", error);
    expect(UserRepository.updateAvatar).not.toHaveBeenCalled();
  });
});

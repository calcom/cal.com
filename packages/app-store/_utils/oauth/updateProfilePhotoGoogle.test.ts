// Import mocked modules AFTER mocks
import { oauth2_v2 } from "@googleapis/oauth2";
import type { OAuth2Client } from "googleapis-common";
import { describe, it, expect, vi, beforeEach } from "vitest";

import logger from "@calcom/lib/logger";
import { uploadAvatar } from "@calcom/lib/server/avatar";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";

import { updateProfilePhotoGoogle } from "./updateProfilePhotoGoogle";

vi.mock("@googleapis/oauth2", () => ({
  oauth2_v2: {
    Oauth2: vi.fn(),
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/avatar", () => ({
  uploadAvatar: vi.fn(),
}));

vi.mock("@calcom/lib/server/resizeBase64Image", () => ({
  resizeBase64Image: vi.fn(),
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
    (uploadAvatar as any).mockResolvedValue("/api/avatar/processed-123.png");
    (resizeBase64Image as any).mockResolvedValue("data:image/png;base64,resized-data");
    (UserRepository.updateAvatar as any).mockResolvedValue(undefined);
  });

  it("should update avatar with valid URL", async () => {
    const validUrl = "https://example.com/avatar.jpg";
    mockOauth2Instance.userinfo.get.mockResolvedValue({
      data: { picture: validUrl },
    });

    await updateProfilePhotoGoogle(mockOAuth2Client, userId);

    expect(UserRepository.updateAvatar).toHaveBeenCalledWith({
      id: userId,
      avatarUrl: validUrl,
    });
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("should process base64 data", async () => {
    const base64Data =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    mockOauth2Instance.userinfo.get.mockResolvedValue({
      data: { picture: base64Data },
    });

    await updateProfilePhotoGoogle(mockOAuth2Client, userId);

    expect(resizeBase64Image).toHaveBeenCalledWith(base64Data);
    expect(uploadAvatar).toHaveBeenCalledWith({
      avatar: "data:image/png;base64,resized-data",
      userId,
    });
    expect(UserRepository.updateAvatar).toHaveBeenCalledWith({
      id: userId,
      avatarUrl: "/api/avatar/processed-123.png",
    });
  });

  it("should do nothing when no picture provided", async () => {
    mockOauth2Instance.userinfo.get.mockResolvedValue({
      data: {},
    });

    await updateProfilePhotoGoogle(mockOAuth2Client, userId);

    expect(UserRepository.updateAvatar).not.toHaveBeenCalled();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    const error = new Error("OAuth API failed");
    mockOauth2Instance.userinfo.get.mockRejectedValue(error);

    await updateProfilePhotoGoogle(mockOAuth2Client, userId);

    expect(logger.error).toHaveBeenCalledWith("Error updating avatarUrl from google calendar connect", error);
    expect(UserRepository.updateAvatar).not.toHaveBeenCalled();
  });
});

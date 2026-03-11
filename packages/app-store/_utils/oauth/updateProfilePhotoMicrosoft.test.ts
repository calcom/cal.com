import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUploadAvatar = vi.fn();
const mockResizeBase64Image = vi.fn();
const mockUpdateUserAvatarUrl = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("@calcom/lib/logger", () => ({
  default: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

vi.mock("@calcom/lib/server/avatar", () => ({
  uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
}));

vi.mock("@calcom/lib/server/resizeBase64Image", () => ({
  resizeBase64Image: (...args: unknown[]) => mockResizeBase64Image(...args),
}));

vi.mock("@calcom/lib/server/updateUserAvatarUrl", () => ({
  updateUserAvatarUrl: (...args: unknown[]) => mockUpdateUserAvatarUrl(...args),
}));

import { updateProfilePhotoMicrosoft } from "./updateProfilePhotoMicrosoft";

function createFetchResponse({
  ok = true,
  status = 200,
  statusText = "OK",
  body = new ArrayBuffer(8),
  contentType = "image/png",
}: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  body?: ArrayBuffer;
  contentType?: string | null;
} = {}) {
  return {
    ok,
    status,
    statusText,
    arrayBuffer: () => Promise.resolve(body),
    headers: {
      get: (name: string) => (name === "content-type" ? contentType : null),
    },
  };
}

describe("updateProfilePhotoMicrosoft", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    mockResizeBase64Image.mockImplementation((img: string) => Promise.resolve(img));
    mockUploadAvatar.mockResolvedValue("/api/avatar/test-key.png");
    mockUpdateUserAvatarUrl.mockResolvedValue(undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches Microsoft Graph photo endpoint with correct Bearer header", async () => {
    const mockFetch = vi.fn().mockResolvedValue(createFetchResponse());
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await updateProfilePhotoMicrosoft("my-token", 1);

    expect(mockFetch).toHaveBeenCalledWith("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: { Authorization: "Bearer my-token" },
    });
  });

  it("converts response to base64 with content-type from header", async () => {
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        createFetchResponse({ body: imageBytes.buffer as ArrayBuffer, contentType: "image/png" })
      ) as unknown as typeof fetch;

    await updateProfilePhotoMicrosoft("token", 1);

    const expectedBase64 = `data:image/png;base64,${Buffer.from(imageBytes).toString("base64")}`;
    expect(mockResizeBase64Image).toHaveBeenCalledWith(expectedBase64);
  });

  it("defaults content-type to image/jpeg when header is missing", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(createFetchResponse({ contentType: null })) as unknown as typeof fetch;

    await updateProfilePhotoMicrosoft("token", 1);

    expect(mockResizeBase64Image).toHaveBeenCalledWith(expect.stringContaining("data:image/jpeg;base64,"));
  });

  it("resizes, uploads, and updates avatarUrl on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createFetchResponse()) as unknown as typeof fetch;
    mockResizeBase64Image.mockResolvedValue("resized-image");
    mockUploadAvatar.mockResolvedValue("/api/avatar/new-key.png");

    await updateProfilePhotoMicrosoft("token", 42);

    expect(mockUploadAvatar).toHaveBeenCalledWith({ avatar: "resized-image", userId: 42 });
    expect(mockUpdateUserAvatarUrl).toHaveBeenCalledWith({ id: 42, avatarUrl: "/api/avatar/new-key.png" });
  });

  it("returns silently on 404 without uploading", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        createFetchResponse({ ok: false, status: 404, statusText: "Not Found" })
      ) as unknown as typeof fetch;

    await updateProfilePhotoMicrosoft("token", 1);

    expect(mockUploadAvatar).not.toHaveBeenCalled();
    expect(mockUpdateUserAvatarUrl).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledWith("Microsoft profile photo not found for user");
  });

  it("returns silently on 500 without uploading", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        createFetchResponse({ ok: false, status: 500, statusText: "Internal Server Error" })
      ) as unknown as typeof fetch;

    await updateProfilePhotoMicrosoft("token", 1);

    expect(mockUploadAvatar).not.toHaveBeenCalled();
    expect(mockUpdateUserAvatarUrl).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Failed to fetch Microsoft profile photo",
      expect.objectContaining({ status: 500 })
    );
  });

  it("returns silently on 403 without uploading", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        createFetchResponse({ ok: false, status: 403, statusText: "Forbidden" })
      ) as unknown as typeof fetch;

    await updateProfilePhotoMicrosoft("token", 1);

    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it("catches network errors and logs without throwing", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network timeout")) as unknown as typeof fetch;

    await expect(updateProfilePhotoMicrosoft("token", 1)).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      "Error updating avatarUrl from Microsoft sign-in",
      expect.any(Error)
    );
  });

  it("catches upload failures and logs without throwing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createFetchResponse()) as unknown as typeof fetch;
    mockUploadAvatar.mockRejectedValue(new Error("Upload failed"));

    await expect(updateProfilePhotoMicrosoft("token", 1)).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      "Error updating avatarUrl from Microsoft sign-in",
      expect.any(Error)
    );
  });

  it("catches updateUserAvatarUrl failures and logs without throwing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createFetchResponse()) as unknown as typeof fetch;
    mockUpdateUserAvatarUrl.mockRejectedValue(new Error("DB error"));

    await expect(updateProfilePhotoMicrosoft("token", 1)).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      "Error updating avatarUrl from Microsoft sign-in",
      expect.any(Error)
    );
  });

  it("logs info at the start of the function", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createFetchResponse()) as unknown as typeof fetch;

    await updateProfilePhotoMicrosoft("token", 1);

    expect(mockLoggerInfo).toHaveBeenCalledWith("updateProfilePhotoMicrosoft called", { hasToken: true });
  });

  it("logs success message on completion", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createFetchResponse()) as unknown as typeof fetch;

    await updateProfilePhotoMicrosoft("token", 1);

    expect(mockLoggerInfo).toHaveBeenCalledWith("Microsoft profile photo updated successfully");
  });

  it("does not throw when function completes successfully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createFetchResponse()) as unknown as typeof fetch;

    await expect(updateProfilePhotoMicrosoft("token", 1)).resolves.toBeUndefined();
  });
});

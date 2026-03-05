import { describe, it, expect, vi } from "vitest";

import type { CredentialPayload } from "@calcom/types/Credential";

const { mockAdapterFactory } = vi.hoisted(() => {
  const mockAdapterFactory = vi.fn(() => ({
    createMeeting: vi.fn(),
    updateMeeting: vi.fn(),
    deleteMeeting: vi.fn(),
    getAvailability: vi.fn(),
  }));
  return { mockAdapterFactory };
});

vi.mock("@calcom/app-store/video.adapters.generated", () => ({
  VideoApiAdapterMap: {
    dailyvideo: Promise.resolve({ default: mockAdapterFactory }),
    zoom: Promise.resolve({ default: mockAdapterFactory }),
    nodefault: Promise.resolve({ default: null }),
  },
}));

import { getVideoAdapters } from "./getVideoAdapters";

const makeCredential = (overrides: Partial<CredentialPayload> = {}): CredentialPayload => ({
  id: 1,
  type: "daily_video",
  key: { api_key: "test" },
  userId: 1,
  user: { email: "test@example.com" },
  teamId: null,
  appId: "daily-video",
  invalid: false,
  delegatedToId: null,
  delegationCredentialId: null,
  encryptedKey: null,
  ...overrides,
});

describe("getVideoAdapters", () => {
  it("should load adapter successfully", async () => {
    const cred = makeCredential({ type: "daily_video" });
    const adapters = await getVideoAdapters([cred]);
    expect(adapters).toHaveLength(1);
    expect(mockAdapterFactory).toHaveBeenCalledWith(cred);
  });

  it("should use fallback slug transformation (zoom_video -> zoom)", async () => {
    const cred = makeCredential({ type: "zoom_video" });
    const adapters = await getVideoAdapters([cred]);
    expect(adapters).toHaveLength(1);
  });

  it("should skip adapter when not found", async () => {
    const cred = makeCredential({ type: "nonexistent_video" });
    const adapters = await getVideoAdapters([cred]);
    expect(adapters).toHaveLength(0);
  });

  it("should skip module without default export", async () => {
    const cred = makeCredential({ type: "no_default" });
    // nodefault won't match directly, need "nodefault"
    // type "no_default" -> split join -> "nodefault"
    const adapters = await getVideoAdapters([cred]);
    expect(adapters).toHaveLength(0);
  });

  it("should return empty array for empty credentials", async () => {
    const adapters = await getVideoAdapters([]);
    expect(adapters).toHaveLength(0);
  });
});

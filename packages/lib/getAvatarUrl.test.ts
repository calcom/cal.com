import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/constants", () => ({
  CAL_URL: "https://app.cal.com",
  AVATAR_FALLBACK: "/avatar.svg",
}));

import { getAbsoluteAvatarUrl, getUserAvatarUrl } from "./getAvatarUrl";

describe("getAbsoluteAvatarUrl", () => {
  it("returns absolute URL as-is", () => {
    expect(getAbsoluteAvatarUrl("https://example.com/avatar.png")).toBe("https://example.com/avatar.png");
  });

  it("prepends CAL_URL to relative path", () => {
    expect(getAbsoluteAvatarUrl("/avatar/user1.png")).toBe("https://app.cal.com/avatar/user1.png");
  });

  it("prepends CAL_URL to path without leading slash", () => {
    expect(getAbsoluteAvatarUrl("avatar.png")).toBe("https://app.cal.comavatar.png");
  });
});

describe("getUserAvatarUrl", () => {
  it("returns absolute avatar URL when user has avatarUrl", () => {
    expect(getUserAvatarUrl({ avatarUrl: "https://cdn.example.com/pic.jpg" })).toBe(
      "https://cdn.example.com/pic.jpg"
    );
  });

  it("returns fallback when user is undefined", () => {
    expect(getUserAvatarUrl(undefined)).toBe("https://app.cal.com/avatar.svg");
  });

  it("returns fallback when avatarUrl is null", () => {
    expect(getUserAvatarUrl({ avatarUrl: null })).toBe("https://app.cal.com/avatar.svg");
  });

  it("prepends CAL_URL to relative avatarUrl", () => {
    expect(getUserAvatarUrl({ avatarUrl: "/user/42/avatar.png" })).toBe(
      "https://app.cal.com/user/42/avatar.png"
    );
  });

  it("returns fallback when avatarUrl is empty string", () => {
    expect(getUserAvatarUrl({ avatarUrl: "" })).toBe("https://app.cal.com/avatar.svg");
  });
});

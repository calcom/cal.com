import { describe, expect, it } from "vitest";
import { getOrgOrTeamAvatar, getPlaceholderAvatar } from "./defaultAvatarImage";

describe("getPlaceholderAvatar", () => {
  it("returns avatar URL when avatar is provided", () => {
    const result = getPlaceholderAvatar("https://example.com/avatar.png", "John");
    expect(result).toBe("https://example.com/avatar.png");
  });

  it("returns placeholder URL when avatar is null", () => {
    const result = getPlaceholderAvatar(null, "John Doe");
    expect(result).toContain("ui-avatars.com");
    expect(result).toContain(encodeURIComponent("John Doe"));
  });

  it("returns placeholder URL when avatar is undefined", () => {
    const result = getPlaceholderAvatar(undefined, "Jane");
    expect(result).toContain("ui-avatars.com");
    expect(result).toContain(encodeURIComponent("Jane"));
  });

  it("returns placeholder URL when avatar is empty string", () => {
    const result = getPlaceholderAvatar("", "Test User");
    expect(result).toContain("ui-avatars.com");
    expect(result).toContain(encodeURIComponent("Test User"));
  });

  it("handles null name in placeholder URL", () => {
    const result = getPlaceholderAvatar(null, null);
    expect(result).toContain("ui-avatars.com");
    expect(result).toContain("name=");
  });

  it("handles undefined name in placeholder URL", () => {
    const result = getPlaceholderAvatar(null, undefined);
    expect(result).toContain("ui-avatars.com");
  });

  it("encodes special characters in name", () => {
    const result = getPlaceholderAvatar(null, "John & Jane");
    expect(result).toContain(encodeURIComponent("John & Jane"));
  });
});

describe("getOrgOrTeamAvatar", () => {
  it("returns team logoUrl when available", () => {
    const team = { logoUrl: "https://example.com/team.png", name: "Team A", parent: null };
    const result = getOrgOrTeamAvatar(team);
    expect(result).toBe("https://example.com/team.png");
  });

  it("falls back to parent logoUrl when team has no logo", () => {
    const team = {
      logoUrl: null,
      name: "Sub Team",
      parent: { logoUrl: "https://example.com/parent.png" },
    };
    const result = getOrgOrTeamAvatar(team);
    expect(result).toBe("https://example.com/parent.png");
  });

  it("returns placeholder when neither team nor parent has logo", () => {
    const team = { logoUrl: null, name: "No Logo Team", parent: { logoUrl: null } };
    const result = getOrgOrTeamAvatar(team);
    expect(result).toContain("ui-avatars.com");
    expect(result).toContain(encodeURIComponent("No Logo Team"));
  });

  it("returns placeholder when parent is null and team has no logo", () => {
    const team = { logoUrl: null, name: "Solo Team", parent: null };
    const result = getOrgOrTeamAvatar(team);
    expect(result).toContain("ui-avatars.com");
    expect(result).toContain(encodeURIComponent("Solo Team"));
  });

  it("prefers team logoUrl over parent logoUrl", () => {
    const team = {
      logoUrl: "https://example.com/team-logo.png",
      name: "Team B",
      parent: { logoUrl: "https://example.com/parent-logo.png" },
    };
    const result = getOrgOrTeamAvatar(team);
    expect(result).toBe("https://example.com/team-logo.png");
  });
});

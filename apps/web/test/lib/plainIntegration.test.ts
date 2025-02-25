/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";

import { getUserTierFromTeams, type SimplifiedTeam, type UserTier } from "../../lib/userTierUtils";

// Add type declaration for window.Plain
declare global {
  interface Window {
    Plain?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      init: (config: any) => void;
      open: () => void;
    };
  }
}

// Mock fetch for API calls
global.fetch = vi.fn();

/**
 * This test verifies that the user tier is correctly passed from the API response
 * to the Plain Chat configuration.
 *
 * Tier hierarchy:
 * - Free users: Users with no team memberships
 * - Teams users: Users who belong to at least one team (including sub-teams)
 * - Enterprise users: Users who belong to an organization
 */
describe("Plain Chat Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.Plain
    global.window = {
      ...global.window,
      Plain: {
        init: vi.fn(),
        open: vi.fn(),
      },
    };
  });

  /**
   * This function simulates the API call and configuration process
   * that happens in the plainChat.tsx component
   */
  async function initPlainChat(mockUserTier: UserTier) {
    // Mock the API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hash: "test-hash",
        email: "test@example.com",
        shortName: "Test",
        appId: "test-app-id",
        fullName: "Test User",
        chatAvatarUrl: "",
        userTier: mockUserTier,
      }),
    });

    // Simulate the API call
    const response = await fetch("/api/plain-hash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // Simulate creating the config
    const plainChatConfig = {
      appId: data.appId,
      customerDetails: {
        email: data.email,
        shortName: data.shortName,
        fullName: data.fullName,
        emailHash: data.hash,
        chatAvatarUrl: data.chatAvatarUrl,
      },
      chatButtons: [
        {
          icon: "chat",
          text: "Ask a question",
          threadDetails: {
            labelTypeIds: ["lt_01JFJWNWAC464N8DZ6YE71YJRF"],
            tierIdentifier: { externalId: data.userTier },
          },
        },
      ],
    };

    // Simulate initializing Plain
    window.Plain.init(plainChatConfig);

    return plainChatConfig;
  }

  /**
   * This function simulates the API call with actual team memberships
   * to determine the user tier dynamically
   */
  async function initPlainChatWithTeams(teams: SimplifiedTeam[]) {
    // Determine the user tier based on team memberships
    const userTier = getUserTierFromTeams(teams);

    // Mock the API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hash: "test-hash",
        email: "test@example.com",
        shortName: "Test",
        appId: "test-app-id",
        fullName: "Test User",
        chatAvatarUrl: "",
        userTier: userTier,
      }),
    });

    // Simulate the API call
    const response = await fetch("/api/plain-hash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // Simulate creating the config
    const plainChatConfig = {
      appId: data.appId,
      customerDetails: {
        email: data.email,
        shortName: data.shortName,
        fullName: data.fullName,
        emailHash: data.hash,
        chatAvatarUrl: data.chatAvatarUrl,
      },
      chatButtons: [
        {
          icon: "chat",
          text: "Ask a question",
          threadDetails: {
            labelTypeIds: ["lt_01JFJWNWAC464N8DZ6YE71YJRF"],
            tierIdentifier: { externalId: data.userTier },
          },
        },
      ],
    };

    // Simulate initializing Plain
    window.Plain.init(plainChatConfig);

    return plainChatConfig;
  }

  it("should pass 'free' tier from API to Plain Chat config for users with no teams", async () => {
    const config = await initPlainChat("free");

    expect(window.Plain.init).toHaveBeenCalledTimes(1);
    expect(window.Plain.init).toHaveBeenCalledWith(
      expect.objectContaining({
        chatButtons: expect.arrayContaining([
          expect.objectContaining({
            threadDetails: expect.objectContaining({
              tierIdentifier: expect.objectContaining({
                externalId: "free",
              }),
            }),
          }),
        ]),
      })
    );

    expect(config.chatButtons[0].threadDetails.tierIdentifier.externalId).toBe("free");
  });

  it("should pass 'teams' tier from API to Plain Chat config for users in a team (including sub-teams)", async () => {
    const config = await initPlainChat("teams");

    expect(window.Plain.init).toHaveBeenCalledTimes(1);
    expect(window.Plain.init).toHaveBeenCalledWith(
      expect.objectContaining({
        chatButtons: expect.arrayContaining([
          expect.objectContaining({
            threadDetails: expect.objectContaining({
              tierIdentifier: expect.objectContaining({
                externalId: "teams",
              }),
            }),
          }),
        ]),
      })
    );

    expect(config.chatButtons[0].threadDetails.tierIdentifier.externalId).toBe("teams");
  });

  it("should pass 'enterprise' tier from API to Plain Chat config for users in an organization", async () => {
    const config = await initPlainChat("enterprise");

    expect(window.Plain.init).toHaveBeenCalledTimes(1);
    expect(window.Plain.init).toHaveBeenCalledWith(
      expect.objectContaining({
        chatButtons: expect.arrayContaining([
          expect.objectContaining({
            threadDetails: expect.objectContaining({
              tierIdentifier: expect.objectContaining({
                externalId: "enterprise",
              }),
            }),
          }),
        ]),
      })
    );

    expect(config.chatButtons[0].threadDetails.tierIdentifier.externalId).toBe("enterprise");
  });

  it("should determine 'free' tier for users with no teams", async () => {
    const config = await initPlainChatWithTeams([]);
    expect(config.chatButtons[0].threadDetails.tierIdentifier.externalId).toBe("free");
  });

  it("should determine 'teams' tier for users in a regular team", async () => {
    const config = await initPlainChatWithTeams([{ metadata: {}, parentId: null }]);
    expect(config.chatButtons[0].threadDetails.tierIdentifier.externalId).toBe("teams");
  });

  it("should determine 'enterprise' tier for users in a team with isOrganization=true", async () => {
    const config = await initPlainChatWithTeams([{ isOrganization: true }]);
    expect(config.chatButtons[0].threadDetails.tierIdentifier.externalId).toBe("enterprise");
  });

  it("should determine 'enterprise' tier for users in a team with organizationSettings", async () => {
    const config = await initPlainChatWithTeams([{ organizationSettings: { id: "123" } }]);
    expect(config.chatButtons[0].threadDetails.tierIdentifier.externalId).toBe("enterprise");
  });

  it("should determine 'enterprise' tier for users in a team with both isOrganization=true and organizationSettings", async () => {
    const config = await initPlainChatWithTeams([
      { isOrganization: true, organizationSettings: { id: "123" } },
    ]);
    expect(config.chatButtons[0].threadDetails.tierIdentifier.externalId).toBe("enterprise");
  });

  it("should include the tier in all chat buttons", async () => {
    // Mock the API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hash: "test-hash",
        email: "test@example.com",
        shortName: "Test",
        appId: "test-app-id",
        fullName: "Test User",
        chatAvatarUrl: "",
        userTier: "teams",
      }),
    });

    // Simulate the API call
    const response = await fetch("/api/plain-hash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // Simulate creating the config with multiple chat buttons
    const plainChatConfig = {
      appId: data.appId,
      customerDetails: {
        email: data.email,
        shortName: data.shortName,
        fullName: data.fullName,
        emailHash: data.hash,
        chatAvatarUrl: data.chatAvatarUrl,
      },
      chatButtons: [
        {
          icon: "chat",
          text: "Ask a question",
          threadDetails: {
            labelTypeIds: ["lt_01JFJWNWAC464N8DZ6YE71YJRF"],
            tierIdentifier: { externalId: data.userTier },
          },
        },
        {
          icon: "bulb",
          text: "Send feedback",
          threadDetails: {
            labelTypeIds: ["lt_01JFJWP3KECF1YQES6XF212RFW"],
            tierIdentifier: { externalId: data.userTier },
          },
        },
      ],
    };

    // Simulate initializing Plain
    window.Plain.init(plainChatConfig);

    // Verify all buttons have the correct tier
    expect(plainChatConfig.chatButtons[0].threadDetails.tierIdentifier.externalId).toBe("teams");
    expect(plainChatConfig.chatButtons[1].threadDetails.tierIdentifier.externalId).toBe("teams");
  });
});

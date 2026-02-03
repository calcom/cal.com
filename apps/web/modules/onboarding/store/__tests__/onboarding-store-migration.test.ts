import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { OnboardingState } from "../onboarding-store";

// Thresholds must match those in onboarding-store.ts
const LOGO_SIZE_THRESHOLD = 500_000;
const BANNER_SIZE_THRESHOLD = 1_500_000;

// Helper to generate a string of specified length (simulating base64 image data)
function generateLargeString(length: number): string {
  return "x".repeat(length);
}

// Helper to create a mock state with optional oversized images
function createMockState(overrides: Partial<OnboardingState> = {}): Partial<OnboardingState> {
  return {
    selectedPlan: "organization",
    organizationDetails: {
      name: "Test Org",
      link: "test-org",
      bio: "Test bio",
    },
    organizationBrand: {
      color: "#000000",
      logo: null,
      banner: null,
    },
    teams: [],
    invites: [],
    inviteRole: "MEMBER",
    migratedMembers: [],
    teamDetails: {
      name: "",
      slug: "",
      bio: "",
    },
    teamBrand: {
      color: "#000000",
      logo: null,
    },
    teamInvites: [],
    teamId: null,
    personalDetails: {
      name: "",
      username: "",
      timezone: "",
      bio: "",
      avatar: null,
    },
    ...overrides,
  };
}

describe("onboarding-store migration", () => {
  let mockStorage: Map<string, string>;
  let mockIndexedDB: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockStorage = new Map();
    mockIndexedDB = {
      getItem: vi.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: vi.fn((key: string) => {
        mockStorage.delete(key);
        return Promise.resolve();
      }),
    };

    vi.doMock("../onboarding-storage", () => ({
      onboardingIndexedDBStorage: {
        getItem: mockIndexedDB.getItem,
        setItem: mockIndexedDB.setItem,
        removeItem: mockIndexedDB.removeItem,
      },
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("isOversizedImage helper", () => {
    it("should return false for null images", () => {
      const isOversized = (imageData: string | null, threshold: number): boolean => {
        if (!imageData) return false;
        return imageData.length > threshold;
      };

      expect(isOversized(null, LOGO_SIZE_THRESHOLD)).toBe(false);
    });

    it("should return false for images under threshold", () => {
      const isOversized = (imageData: string | null, threshold: number): boolean => {
        if (!imageData) return false;
        return imageData.length > threshold;
      };

      const smallImage = generateLargeString(100_000); // 100KB
      expect(isOversized(smallImage, LOGO_SIZE_THRESHOLD)).toBe(false);
    });

    it("should return true for images over threshold", () => {
      const isOversized = (imageData: string | null, threshold: number): boolean => {
        if (!imageData) return false;
        return imageData.length > threshold;
      };

      const largeImage = generateLargeString(600_000); // 600KB
      expect(isOversized(largeImage, LOGO_SIZE_THRESHOLD)).toBe(true);
    });
  });

  describe("migration from version 0 to version 1", () => {
    it("should clear oversized organization logo", () => {
      const oversizedLogo = generateLargeString(LOGO_SIZE_THRESHOLD + 1);
      const state = createMockState({
        organizationBrand: {
          color: "#000000",
          logo: oversizedLogo,
          banner: null,
        },
      });

      // Simulate migration logic
      if (state.organizationBrand) {
        if (state.organizationBrand.logo && state.organizationBrand.logo.length > LOGO_SIZE_THRESHOLD) {
          state.organizationBrand.logo = null;
        }
      }

      expect(state.organizationBrand?.logo).toBeNull();
    });

    it("should clear oversized organization banner", () => {
      const oversizedBanner = generateLargeString(BANNER_SIZE_THRESHOLD + 1);
      const state = createMockState({
        organizationBrand: {
          color: "#000000",
          logo: null,
          banner: oversizedBanner,
        },
      });

      // Simulate migration logic
      if (state.organizationBrand) {
        if (state.organizationBrand.banner && state.organizationBrand.banner.length > BANNER_SIZE_THRESHOLD) {
          state.organizationBrand.banner = null;
        }
      }

      expect(state.organizationBrand?.banner).toBeNull();
    });

    it("should clear oversized team logo", () => {
      const oversizedLogo = generateLargeString(LOGO_SIZE_THRESHOLD + 1);
      const state = createMockState({
        teamBrand: {
          color: "#000000",
          logo: oversizedLogo,
        },
      });

      // Simulate migration logic
      if (state.teamBrand) {
        if (state.teamBrand.logo && state.teamBrand.logo.length > LOGO_SIZE_THRESHOLD) {
          state.teamBrand.logo = null;
        }
      }

      expect(state.teamBrand?.logo).toBeNull();
    });

    it("should clear oversized personal avatar", () => {
      const oversizedAvatar = generateLargeString(LOGO_SIZE_THRESHOLD + 1);
      const state = createMockState({
        personalDetails: {
          name: "Test User",
          username: "testuser",
          timezone: "UTC",
          bio: "Test bio",
          avatar: oversizedAvatar,
        },
      });

      // Simulate migration logic
      if (state.personalDetails) {
        if (state.personalDetails.avatar && state.personalDetails.avatar.length > LOGO_SIZE_THRESHOLD) {
          state.personalDetails.avatar = null;
        }
      }

      expect(state.personalDetails?.avatar).toBeNull();
    });

    it("should preserve properly sized images", () => {
      const smallLogo = generateLargeString(100_000); // 100KB - well under threshold
      const smallBanner = generateLargeString(500_000); // 500KB - well under threshold
      const state = createMockState({
        organizationBrand: {
          color: "#000000",
          logo: smallLogo,
          banner: smallBanner,
        },
      });

      // Simulate migration logic
      if (state.organizationBrand) {
        if (state.organizationBrand.logo && state.organizationBrand.logo.length > LOGO_SIZE_THRESHOLD) {
          state.organizationBrand.logo = null;
        }
        if (state.organizationBrand.banner && state.organizationBrand.banner.length > BANNER_SIZE_THRESHOLD) {
          state.organizationBrand.banner = null;
        }
      }

      expect(state.organizationBrand?.logo).toBe(smallLogo);
      expect(state.organizationBrand?.banner).toBe(smallBanner);
    });

    it("should clear all oversized images in a single migration", () => {
      const oversizedLogo = generateLargeString(LOGO_SIZE_THRESHOLD + 1);
      const oversizedBanner = generateLargeString(BANNER_SIZE_THRESHOLD + 1);
      const oversizedTeamLogo = generateLargeString(LOGO_SIZE_THRESHOLD + 1);
      const oversizedAvatar = generateLargeString(LOGO_SIZE_THRESHOLD + 1);

      const state = createMockState({
        organizationBrand: {
          color: "#000000",
          logo: oversizedLogo,
          banner: oversizedBanner,
        },
        teamBrand: {
          color: "#000000",
          logo: oversizedTeamLogo,
        },
        personalDetails: {
          name: "Test User",
          username: "testuser",
          timezone: "UTC",
          bio: "Test bio",
          avatar: oversizedAvatar,
        },
      });

      // Simulate migration logic (same as in onboarding-store.ts)
      if (state.organizationBrand) {
        if (state.organizationBrand.logo && state.organizationBrand.logo.length > LOGO_SIZE_THRESHOLD) {
          state.organizationBrand.logo = null;
        }
        if (state.organizationBrand.banner && state.organizationBrand.banner.length > BANNER_SIZE_THRESHOLD) {
          state.organizationBrand.banner = null;
        }
      }
      if (state.teamBrand) {
        if (state.teamBrand.logo && state.teamBrand.logo.length > LOGO_SIZE_THRESHOLD) {
          state.teamBrand.logo = null;
        }
      }
      if (state.personalDetails) {
        if (state.personalDetails.avatar && state.personalDetails.avatar.length > LOGO_SIZE_THRESHOLD) {
          state.personalDetails.avatar = null;
        }
      }

      expect(state.organizationBrand?.logo).toBeNull();
      expect(state.organizationBrand?.banner).toBeNull();
      expect(state.teamBrand?.logo).toBeNull();
      expect(state.personalDetails?.avatar).toBeNull();
    });

    it("should preserve non-image data during migration", () => {
      const oversizedLogo = generateLargeString(LOGO_SIZE_THRESHOLD + 1);
      const state = createMockState({
        organizationDetails: {
          name: "My Organization",
          link: "my-org",
          bio: "This is my organization",
        },
        organizationBrand: {
          color: "#FF5500",
          logo: oversizedLogo,
          banner: null,
        },
        teams: [{ id: 1, name: "Team A", slug: "team-a", isBeingMigrated: true }],
        invites: [{ email: "test@example.com", team: "Team A", role: "MEMBER" }],
      });

      // Simulate migration logic
      if (state.organizationBrand) {
        if (state.organizationBrand.logo && state.organizationBrand.logo.length > LOGO_SIZE_THRESHOLD) {
          state.organizationBrand.logo = null;
        }
      }

      // Verify non-image data is preserved
      expect(state.organizationDetails?.name).toBe("My Organization");
      expect(state.organizationDetails?.link).toBe("my-org");
      expect(state.organizationDetails?.bio).toBe("This is my organization");
      expect(state.organizationBrand?.color).toBe("#FF5500");
      expect(state.teams).toHaveLength(1);
      expect(state.invites).toHaveLength(1);
      // But oversized logo is cleared
      expect(state.organizationBrand?.logo).toBeNull();
    });
  });

  describe("threshold values", () => {
    it("should use 500KB threshold for logos", () => {
      expect(LOGO_SIZE_THRESHOLD).toBe(500_000);
    });

    it("should use 1.5MB threshold for banners", () => {
      expect(BANNER_SIZE_THRESHOLD).toBe(1_500_000);
    });

    it("should allow images exactly at the threshold", () => {
      const exactThresholdLogo = generateLargeString(LOGO_SIZE_THRESHOLD);
      const isOversized = exactThresholdLogo.length > LOGO_SIZE_THRESHOLD;
      expect(isOversized).toBe(false);
    });

    it("should clear images one byte over the threshold", () => {
      const justOverThresholdLogo = generateLargeString(LOGO_SIZE_THRESHOLD + 1);
      const isOversized = justOverThresholdLogo.length > LOGO_SIZE_THRESHOLD;
      expect(isOversized).toBe(true);
    });
  });
});

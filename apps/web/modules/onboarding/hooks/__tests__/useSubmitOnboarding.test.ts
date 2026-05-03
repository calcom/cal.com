import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OnboardingState } from "../../store/onboarding-store";
import { useSubmitOnboarding } from "../useSubmitOnboarding";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return {
    ...actual,
    useState: vi.fn((initial: boolean | string | null) => [initial, vi.fn()]),
  };
});

vi.mock("@calcom/features/flags/context/provider", () => ({
  useFlagMap: vi.fn(() => ({})),
}));

const mockShowToast = vi.fn();
vi.mock("@calcom/ui/components/toast", () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      organizations: {
        intentToCreateOrg: {
          useMutation: vi.fn(),
        },
      },
    },
  },
}));

describe("useSubmitOnboarding", () => {
  let mockResetOnboarding: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockResetOnboarding = vi.fn();
    mockShowToast.mockClear();

    global.window = {
      location: {
        href: "",
      },
    } as unknown as Window & typeof globalThis;
  });

  it("should submit teams with migration data and redirect to event-types for migrated teams", async () => {
    const hook = useSubmitOnboarding();
    const { submitOnboarding } = hook;

    const store = {
      selectedPlan: "organization",
      organizationDetails: {
        name: "Test Org",
        link: "test-org",
        bio: "Test bio",
      },
      organizationBrand: {
        color: "#000000",
        logo: "logo.png",
        banner: "banner.png",
      },
      teams: [
        { id: 1, name: "Existing Team", slug: "existing-team", isBeingMigrated: true },
        { id: -1, name: "New Team", slug: null, isBeingMigrated: false },
      ],
      invites: [{ email: "invite@example.com", team: "New Team", role: "MEMBER" }],
      inviteRole: "MEMBER",
      migratedMembers: [{ email: "migrated@example.com", teamId: 1, role: "MEMBER" as const }],
      resetOnboarding: mockResetOnboarding,
    } as unknown as OnboardingState;

    await submitOnboarding(store, "user@example.com", store.invites);

    // After EE removal, intentToCreateOrg is a no-op stub returning {}
    // No checkoutUrl → migration flow (has migrated teams) → redirects to event-types
    expect(mockShowToast).toHaveBeenCalledWith("Organization created successfully!", "success");
    expect(mockResetOnboarding).toHaveBeenCalled();
    expect(window.location.href).toBe("/event-types?newOrganizationModal=true");
  });

  it("should redirect to event-types when migrated teams exist", async () => {
    const hook = useSubmitOnboarding();
    const { submitOnboarding } = hook;

    const store = {
      selectedPlan: "organization",
      organizationDetails: {
        name: "Test Org",
        link: "test-org",
        bio: "Test bio",
      },
      organizationBrand: {
        color: "#000000",
        logo: "logo.png",
        banner: "banner.png",
      },
      teams: [
        { id: 1, name: "Existing Team", slug: "existing-team", isBeingMigrated: true },
        { id: 2, name: "Another Existing Team", slug: "another-existing-team", isBeingMigrated: true },
        { id: -1, name: "New Team", slug: null, isBeingMigrated: false },
      ],
      invites: [
        { email: "invite1@example.com", team: "Existing Team", role: "MEMBER" },
        { email: "invite2@example.com", team: "New Team", role: "ADMIN" },
        { email: "invite3@example.com", team: "another existing team", role: "MEMBER" },
      ],
      inviteRole: "MEMBER",
      migratedMembers: [],
      resetOnboarding: mockResetOnboarding,
    } as unknown as OnboardingState;

    await submitOnboarding(store, "user@example.com", store.invites);

    expect(mockShowToast).toHaveBeenCalledWith("Organization created successfully!", "success");
    expect(mockResetOnboarding).toHaveBeenCalled();
    expect(window.location.href).toBe("/event-types?newOrganizationModal=true");
  });

  it("should redirect to event-types when migrated teams exist even with empty team invites", async () => {
    const hook = useSubmitOnboarding();
    const { submitOnboarding } = hook;

    const store = {
      selectedPlan: "organization",
      organizationDetails: {
        name: "Test Org",
        link: "test-org",
        bio: "Test bio",
      },
      organizationBrand: {
        color: "#000000",
        logo: "logo.png",
        banner: "banner.png",
      },
      teams: [{ id: 1, name: "Existing Team", slug: "existing-team", isBeingMigrated: true }],
      invites: [
        { email: "invite1@example.com", team: "", role: "MEMBER" },
        { email: "invite2@example.com", team: "   ", role: "ADMIN" },
      ],
      inviteRole: "MEMBER",
      migratedMembers: [],
      resetOnboarding: mockResetOnboarding,
    } as unknown as OnboardingState;

    await submitOnboarding(store, "user@example.com", store.invites);

    expect(mockShowToast).toHaveBeenCalledWith("Organization created successfully!", "success");
    expect(mockResetOnboarding).toHaveBeenCalled();
    expect(window.location.href).toBe("/event-types?newOrganizationModal=true");
  });

  it("should redirect to getting-started when no migrated teams exist", async () => {
    const hook = useSubmitOnboarding();
    const { submitOnboarding } = hook;

    const store = {
      selectedPlan: "organization",
      organizationDetails: {
        name: "Test Org",
        link: "test-org",
        bio: "",
      },
      organizationBrand: {
        color: "#000000",
        logo: null,
        banner: null,
      },
      teams: [{ id: -1, name: "New Team", slug: null, isBeingMigrated: false }],
      invites: [],
      inviteRole: "MEMBER",
      migratedMembers: [],
      resetOnboarding: mockResetOnboarding,
    } as unknown as OnboardingState;

    await submitOnboarding(store, "user@example.com", []);

    // Regular flow: no migrated teams → redirects to getting-started
    expect(mockShowToast).toHaveBeenCalledWith("Organization created successfully!", "success");
    expect(mockResetOnboarding).toHaveBeenCalled();
    expect(window.location.href).toBe("/getting-started");
  });
});

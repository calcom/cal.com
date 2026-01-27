import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CreationSource } from "@calcom/prisma/enums";

import type { OnboardingState } from "../../store/onboarding-store";
import { useSubmitOnboarding } from "../useSubmitOnboarding";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return {
    ...actual,
    useState: vi.fn((initial: any) => [initial, vi.fn()]),
  };
});

vi.mock("@calcom/features/flags/context/provider", () => ({
  useFlagMap: vi.fn(() => ({})),
}));

vi.mock("@calcom/features/ee/organizations/hooks/useWelcomeModal", () => ({
  setShowNewOrgModalFlag: vi.fn(),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
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
  let mockMutateAsync: ReturnType<typeof vi.fn>;
  let mockResetOnboarding: ReturnType<typeof vi.fn>;
  let mockUseMutation: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockMutateAsync = vi.fn();
    mockResetOnboarding = vi.fn();
    mockUseMutation = vi.fn(() => ({
      mutateAsync: mockMutateAsync,
    }));

    // Mock window for skipToPersonal
    global.window = {
      location: {
        href: "",
      },
    } as any;

    const { trpc } = await import("@calcom/trpc/react");
    vi.mocked(trpc.viewer.organizations.intentToCreateOrg.useMutation).mockImplementation(
      mockUseMutation as any
    );
  });

  it("should submit teams with migration data correctly", async () => {
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

    mockMutateAsync.mockResolvedValue({
      checkoutUrl: "https://stripe.com/checkout",
    });

    await submitOnboarding(store, "user@example.com", store.invites);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: "Test Org",
      slug: "test-org",
      bio: "Test bio",
      logo: "logo.png",
      brandColor: "#000000",
      bannerUrl: "banner.png",
      orgOwnerEmail: "user@example.com",
      seats: null,
      pricePerSeat: null,
      isPlatform: false,
      creationSource: CreationSource.WEBAPP,
      teams: [
        { id: 1, name: "Existing Team", isBeingMigrated: true, slug: "existing-team" },
        { id: -1, name: "New Team", isBeingMigrated: false, slug: null },
      ],
      invitedMembers: [
        { email: "invite@example.com", teamName: "New Team", teamId: -1, role: "MEMBER" },
        { email: "migrated@example.com", teamId: 1, role: "MEMBER" },
      ],
    });
  });

  it("should use teamId for invites to migrated teams", async () => {
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

    mockMutateAsync.mockResolvedValue({
      checkoutUrl: "https://stripe.com/checkout",
    });

    await submitOnboarding(store, "user@example.com", store.invites);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: "Test Org",
      slug: "test-org",
      bio: "Test bio",
      logo: "logo.png",
      brandColor: "#000000",
      bannerUrl: "banner.png",
      orgOwnerEmail: "user@example.com",
      seats: null,
      pricePerSeat: null,
      isPlatform: false,
      creationSource: CreationSource.WEBAPP,
      teams: [
        { id: 1, name: "Existing Team", isBeingMigrated: true, slug: "existing-team" },
        { id: 2, name: "Another Existing Team", isBeingMigrated: true, slug: "another-existing-team" },
        { id: -1, name: "New Team", isBeingMigrated: false, slug: null },
      ],
      invitedMembers: [
        // Migrated team invite should use teamId
        { email: "invite1@example.com", teamId: 1, teamName: undefined, role: "MEMBER" },
        // New team invite should use teamName (note: implementation uses inviteRole from store, not invite.role)
        { email: "invite2@example.com", teamName: "New Team", teamId: -1, role: "MEMBER" },
        // Migrated team invite with different case should still use teamId
        { email: "invite3@example.com", teamId: 2, teamName: undefined, role: "MEMBER" },
      ],
    });
  });

  it("should handle invites without teams correctly", async () => {
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

    mockMutateAsync.mockResolvedValue({
      checkoutUrl: "https://stripe.com/checkout",
    });

    await submitOnboarding(store, "user@example.com", store.invites);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: "Test Org",
      slug: "test-org",
      bio: "Test bio",
      logo: "logo.png",
      brandColor: "#000000",
      bannerUrl: "banner.png",
      orgOwnerEmail: "user@example.com",
      seats: null,
      pricePerSeat: null,
      isPlatform: false,
      creationSource: CreationSource.WEBAPP,
      teams: [{ id: 1, name: "Existing Team", isBeingMigrated: true, slug: "existing-team" }],
      invitedMembers: [
        // Invites without teams should have neither teamId nor teamName (note: implementation uses inviteRole from store)
        { email: "invite1@example.com", teamId: undefined, teamName: undefined, role: "MEMBER" },
        { email: "invite2@example.com", teamId: undefined, teamName: undefined, role: "MEMBER" },
      ],
    });
  });

  it("should handle teams with null slugs correctly", async () => {
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

    mockMutateAsync.mockResolvedValue({
      checkoutUrl: null,
      organizationId: 123,
    });

    await submitOnboarding(store, "user@example.com", []);

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        teams: [{ id: -1, name: "New Team", isBeingMigrated: false, slug: null }],
        invitedMembers: [],
      })
    );
  });
});

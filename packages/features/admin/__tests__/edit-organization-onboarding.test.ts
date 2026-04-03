import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditOrganizationOnboardingInput } from "../actions/edit-organization-onboarding";
import { EditOrganizationOnboardingAction } from "../actions/edit-organization-onboarding";

function createMockDeps() {
  return {
    orgOnboardingRepo: {
      findById: vi.fn().mockResolvedValue({
        id: "abc-123",
        name: "Test Org",
        slug: "test-org",
        orgOwnerEmail: "owner@example.com",
      }),
      delete: vi.fn(),
      update: vi.fn().mockResolvedValue({
        id: "abc-123",
        name: "Updated Org",
        slug: "updated-org",
        orgOwnerEmail: "owner@example.com",
        billingPeriod: "ANNUALLY",
        billingMode: "SEATS",
        pricePerSeat: 12,
        seats: 10,
        minSeats: null,
        isPlatform: false,
        isComplete: false,
        isDomainConfigured: false,
        logo: null,
        bio: null,
        brandColor: null,
        bannerUrl: null,
        error: null,
      }),
    },
  };
}

describe("EditOrganizationOnboardingAction", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let action: EditOrganizationOnboardingAction;

  beforeEach(() => {
    deps = createMockDeps();
    action = new EditOrganizationOnboardingAction(deps);
  });

  it("should update an existing onboarding record", async () => {
    const input: EditOrganizationOnboardingInput = {
      id: "abc-123",
      data: { name: "Updated Org", slug: "updated-org" },
    };

    const result = await action.execute(input);

    expect(deps.orgOnboardingRepo.findById).toHaveBeenCalledWith("abc-123");
    expect(deps.orgOnboardingRepo.update).toHaveBeenCalledWith("abc-123", {
      name: "Updated Org",
      slug: "updated-org",
    });
    expect(result).toEqual({
      success: true,
      id: "abc-123",
      name: "Updated Org",
      slug: "updated-org",
    });
  });

  it("should throw NotFound when record does not exist", async () => {
    deps.orgOnboardingRepo.findById.mockResolvedValue(null);

    const input: EditOrganizationOnboardingInput = {
      id: "nonexistent",
      data: { name: "Updated" },
    };

    await expect(action.execute(input)).rejects.toThrow(
      "Organization onboarding record nonexistent not found"
    );
    expect(deps.orgOnboardingRepo.update).not.toHaveBeenCalled();
  });

  it("should pass partial data to the repository", async () => {
    const input: EditOrganizationOnboardingInput = {
      id: "abc-123",
      data: { seats: 20, isPlatform: true },
    };

    await action.execute(input);

    expect(deps.orgOnboardingRepo.update).toHaveBeenCalledWith("abc-123", {
      seats: 20,
      isPlatform: true,
    });
  });
});

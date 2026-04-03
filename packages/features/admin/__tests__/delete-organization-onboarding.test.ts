import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeleteOrganizationOnboardingInput } from "../actions/delete-organization-onboarding";
import { DeleteOrganizationOnboardingAction } from "../actions/delete-organization-onboarding";

function createMockDeps() {
  return {
    orgOnboardingRepo: {
      findById: vi.fn().mockResolvedValue({
        id: "abc-123",
        name: "Test Org",
        slug: "test-org",
        orgOwnerEmail: "owner@example.com",
      }),
      delete: vi.fn().mockResolvedValue({
        id: "abc-123",
        name: "Test Org",
        slug: "test-org",
        orgOwnerEmail: "owner@example.com",
      }),
      update: vi.fn(),
    },
  };
}

describe("DeleteOrganizationOnboardingAction", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let action: DeleteOrganizationOnboardingAction;

  beforeEach(() => {
    deps = createMockDeps();
    action = new DeleteOrganizationOnboardingAction(deps);
  });

  it("should delete an existing onboarding record", async () => {
    const input: DeleteOrganizationOnboardingInput = { id: "abc-123" };

    const result = await action.execute(input);

    expect(deps.orgOnboardingRepo.findById).toHaveBeenCalledWith("abc-123");
    expect(deps.orgOnboardingRepo.delete).toHaveBeenCalledWith("abc-123");
    expect(result).toEqual({
      success: true,
      id: "abc-123",
      name: "Test Org",
      slug: "test-org",
    });
  });

  it("should throw NotFound when record does not exist", async () => {
    deps.orgOnboardingRepo.findById.mockResolvedValue(null);

    await expect(action.execute({ id: "nonexistent" })).rejects.toThrow(
      "Organization onboarding record nonexistent not found"
    );
    expect(deps.orgOnboardingRepo.delete).not.toHaveBeenCalled();
  });
});

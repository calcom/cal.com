import { beforeEach, describe, expect, it, vi } from "vitest";

import { TRPCError } from "@trpc/server";

import { createHandler } from "./create.handler";

const mockCreateEventType = vi.fn();
const mockCheckSuccessRedirectUrlAllowed = vi.fn();

vi.mock("@calcom/features/eventtypes/repositories/eventTypeRepository");
vi.mock("@calcom/features/eventtypes/lib/successRedirectUrlAllowed", () => ({
  checkSuccessRedirectUrlAllowed: (...args: unknown[]) => mockCheckSuccessRedirectUrlAllowed(...args),
}));

describe("createHandler", () => {
  type CreateHandlerInput = Parameters<typeof createHandler>[0];

  const ctx = {
    user: {
      id: 1,
      role: "USER",
      organizationId: null,
      organization: { isOrgAdmin: false },
      profile: { id: 1 },
      metadata: {},
      email: "user@cal.com",
    },
    prisma: {},
  } as unknown as CreateHandlerInput["ctx"];

  const input = {
    title: "Test Event",
    slug: "test-event",
    length: 30,
    locations: [{ type: "phone" }],
    successRedirectUrl: "https://cal.com/success",
  } as unknown as CreateHandlerInput["input"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const { EventTypeRepository } = await import(
      "@calcom/features/eventtypes/repositories/eventTypeRepository"
    );
    vi.mocked(EventTypeRepository).mockImplementation(function () {
      return {
        create: mockCreateEventType,
      } as unknown as InstanceType<typeof EventTypeRepository>;
    });
    mockCreateEventType.mockResolvedValue({ id: 999 });
    mockCheckSuccessRedirectUrlAllowed.mockResolvedValue({ allowed: true });
  });

  it("throws FORBIDDEN when successRedirectUrl is not allowed", async () => {
    const reason =
      "Redirect on booking is a feature for team plan users. Please upgrade to a team plan to use this feature.";
    mockCheckSuccessRedirectUrlAllowed.mockResolvedValue({
      allowed: false,
      reason,
    });

    await expect(createHandler({ ctx, input })).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: reason,
      })
    );
    expect(mockCreateEventType).not.toHaveBeenCalled();
  });

  it("creates event type when successRedirectUrl is allowed", async () => {
    await expect(createHandler({ ctx, input })).resolves.toEqual({ eventType: { id: 999 } });
    expect(mockCheckSuccessRedirectUrlAllowed).toHaveBeenCalledWith({ userId: 1 });
    expect(mockCreateEventType).toHaveBeenCalledWith(
      expect.objectContaining({
        successRedirectUrl: "https://cal.com/success",
      })
    );
  });
});

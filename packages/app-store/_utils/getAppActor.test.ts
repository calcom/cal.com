import { describe, it, expect, vi } from "vitest";

vi.mock("@calcom/features/booking-audit/lib/getAppNameFromSlug", () => ({
  getAppNameFromSlug: vi.fn(({ appSlug }: { appSlug: string }) => `App: ${appSlug}`),
}));

vi.mock("@calcom/features/booking-audit/lib/makeActor", () => ({
  makeAppActor: vi.fn(({ credentialId }: { credentialId: number }) => ({
    type: "app" as const,
    credentialId,
  })),
  makeAppActorUsingSlug: vi.fn(({ appSlug, name }: { appSlug: string; name: string }) => ({
    type: "app_slug" as const,
    appSlug,
    name,
  })),
}));

import { getAppActor } from "./getAppActor";

describe("getAppActor", () => {
  it("should use makeAppActor when app has credentialId", () => {
    const actor = getAppActor({
      appSlug: "stripe",
      bookingId: 123,
      apps: {
        stripe: { credentialId: 42, enabled: true },
      } as Parameters<typeof getAppActor>[0]["apps"],
    });
    expect(actor).toHaveProperty("credentialId", 42);
  });

  it("should fallback to makeAppActorUsingSlug when no credentialId", () => {
    const actor = getAppActor({
      appSlug: "stripe",
      bookingId: 123,
      apps: {
        stripe: { enabled: true },
      } as Parameters<typeof getAppActor>[0]["apps"],
    });
    expect(actor).toHaveProperty("appSlug", "stripe");
  });

  it("should fallback to slug when apps is null/undefined", () => {
    const actor = getAppActor({
      appSlug: "stripe",
      bookingId: 123,
      apps: undefined,
    });
    expect(actor).toHaveProperty("appSlug", "stripe");
  });

  it("should fallback to slug when app not found in apps metadata", () => {
    const actor = getAppActor({
      appSlug: "paypal",
      bookingId: 123,
      apps: {
        stripe: { credentialId: 42, enabled: true },
      } as Parameters<typeof getAppActor>[0]["apps"],
    });
    expect(actor).toHaveProperty("appSlug", "paypal");
  });
});

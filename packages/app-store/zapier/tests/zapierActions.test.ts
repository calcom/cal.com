import { describe, it, expect } from "vitest";

import { mapZapierActionToWebhookEvent } from "../trpc/subscriptions";
import { noShowAction } from "../lib/actions/noShow";
import { zapierActions } from "../lib/actions";

describe("Zapier No-Show Action", () => {
  it("should have correct action id", () => {
    expect(noShowAction.id).toBe("booking_no_show");
  });

  it("should have correct trigger event", () => {
    expect(noShowAction.operation.triggerEvent).toBe("BOOKING_NO_SHOW_UPDATED");
  });

  it("should be included in zapierActions", () => {
    expect(zapierActions).toContainEqual(noShowAction);
  });

  it("should map booking_no_show to BOOKING_NO_SHOW_UPDATED", () => {
    const result = mapZapierActionToWebhookEvent("booking_no_show");
    expect(result).toBe("BOOKING_NO_SHOW_UPDATED");
  });

  it("should return null for unknown actions", () => {
    const result = mapZapierActionToWebhookEvent("unknown_action");
    expect(result).toBeNull();
  });
});

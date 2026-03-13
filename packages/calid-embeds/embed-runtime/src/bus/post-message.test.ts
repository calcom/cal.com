import { describe, expect, it, vi } from "vitest";

import { createPostMessageRouter, parsePostMessage, type PostMessageEnvelope } from "./post-message";

const baseMessage: PostMessageEnvelope<"set_calendar_event_type"> = {
  version: 1,
  source: "external_embed",
  type: "set_calendar_event_type",
  payload: { eventType: "team/sales/intro" },
  namespace: "ns",
};

describe("post-message", () => {
  it("rejects invalid envelopes", () => {
    expect(parsePostMessage({})).toBeNull();
    expect(parsePostMessage({ version: 1, source: "x", type: "unknown", payload: {} })).toBeNull();
    expect(
      parsePostMessage({
        version: 1,
        source: "external_embed",
        type: "set_calendar_event_type",
        payload: {},
      })
    ).toBeNull();
  });

  it("validates set_calendar_event_type payload", () => {
    expect(
      parsePostMessage({
        ...baseMessage,
        payload: { eventType: "" },
      })
    ).toBeNull();

    expect(
      parsePostMessage({
        ...baseMessage,
        payload: { eventType: "team/sales/intro", fieldIdentifier: "event_type" },
      })
    ).not.toBeNull();
  });

  it("validates set_field_value payload", () => {
    expect(
      parsePostMessage({
        version: 1,
        source: "external_embed",
        type: "set_field_value",
        payload: { value: "Acme" },
      })
    ).toBeNull();

    expect(
      parsePostMessage({
        version: 1,
        source: "external_embed",
        type: "set_field_value",
        payload: { fieldIdentifier: "company", value: "Acme" },
      })
    ).not.toBeNull();

    expect(
      parsePostMessage({
        version: 1,
        source: "external_embed",
        type: "set_field_value",
        payload: { fieldIdentifier: "size", value: ["small", "medium"] },
      })
    ).not.toBeNull();
  });

  it("validates booking_acknowledgement payload", () => {
    expect(
      parsePostMessage({
        version: 1,
        source: "external_embed",
        type: "booking_acknowledgement",
        payload: {},
      })
    ).toBeNull();

    expect(
      parsePostMessage({
        version: 1,
        source: "external_embed",
        type: "booking_acknowledgement",
        payload: { submissionId: "sub_123" },
      })
    ).not.toBeNull();
  });

  it("routes messages and respects origin + namespace", () => {
    const handler = vi.fn();
    const router = createPostMessageRouter({
      namespace: "ns",
      allowedOrigins: ["https://example.com"],
      handlers: { set_calendar_event_type: handler },
    });
    router.attach();

    window.dispatchEvent(
      new MessageEvent("message", { data: baseMessage, origin: "https://example.com" })
    );
    expect(handler).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new MessageEvent("message", { data: baseMessage, origin: "https://evil.com" })
    );
    expect(handler).toHaveBeenCalledTimes(1);

    router.detach();
    window.dispatchEvent(
      new MessageEvent("message", { data: baseMessage, origin: "https://example.com" })
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

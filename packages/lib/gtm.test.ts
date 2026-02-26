// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pushGTMEvent } from "./gtm";

describe("pushGTMEvent", () => {
  beforeEach(() => {
    window.dataLayer = [];
  });

  afterEach(() => {
    // @ts-expect-error -- cleanup
    delete window.dataLayer;
  });

  it("pushes event to dataLayer", () => {
    pushGTMEvent("test_event");
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0]).toMatchObject({ event: "test_event" });
  });

  it("includes additional data in push", () => {
    pushGTMEvent("checkout", { value: 100, currency: "USD" });
    expect(window.dataLayer[0]).toEqual({
      event: "checkout",
      value: 100,
      currency: "USD",
    });
  });

  it("handles undefined data parameter", () => {
    pushGTMEvent("simple_event", undefined);
    expect(window.dataLayer[0]).toEqual({ event: "simple_event" });
  });

  it("handles missing dataLayer gracefully", () => {
    // @ts-expect-error -- simulate missing dataLayer
    delete window.dataLayer;
    // Should not throw
    expect(() => pushGTMEvent("event_no_layer")).not.toThrow();
  });
});

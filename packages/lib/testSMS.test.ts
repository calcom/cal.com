import { beforeEach, describe, expect, it } from "vitest";
import { getTestSMS, resetTestSMS, setTestSMS } from "./testSMS";

describe("testSMS", () => {
  beforeEach(() => {
    resetTestSMS();
  });

  it("returns undefined before any SMS are set", () => {
    globalThis.testSMS = undefined as unknown as typeof globalThis.testSMS;
    expect(getTestSMS()).toBeUndefined();
  });

  it("initializes the array on first setTestSMS call", () => {
    globalThis.testSMS = undefined as unknown as typeof globalThis.testSMS;
    setTestSMS({
      to: "+1234567890",
      from: "+0987654321",
      message: "Hello",
    });
    expect(getTestSMS()).toHaveLength(1);
  });

  it("pushes SMS to the global array", () => {
    setTestSMS({ to: "+111", from: "+222", message: "First" });
    setTestSMS({ to: "+333", from: "+444", message: "Second" });
    expect(getTestSMS()).toHaveLength(2);
    expect(getTestSMS()[0].message).toBe("First");
    expect(getTestSMS()[1].message).toBe("Second");
  });

  it("preserves all fields on the SMS object", () => {
    setTestSMS({ to: "+111", from: "+222", message: "Test message" });
    const sms = getTestSMS()[0];
    expect(sms).toEqual({
      to: "+111",
      from: "+222",
      message: "Test message",
    });
  });

  it("resetTestSMS clears all SMS", () => {
    setTestSMS({ to: "+111", from: "+222", message: "msg" });
    expect(getTestSMS()).toHaveLength(1);
    resetTestSMS();
    expect(getTestSMS()).toHaveLength(0);
  });
});

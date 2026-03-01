import { describe, expect, it } from "vitest";
import { handleCustomInputs } from "./handleCustomInputs";

describe("handleCustomInputs", () => {
  it("validates required text inputs", () => {
    const eventTypeCustomInputs = [
      { id: 1, eventTypeId: 1, label: "Company", type: "TEXT", required: true, placeholder: "" },
    ];
    const reqCustomInputs = [{ label: "Company", value: "Cal.com" }];

    expect(() => handleCustomInputs(eventTypeCustomInputs as never, reqCustomInputs)).not.toThrow();
  });

  it("throws when required text input is missing", () => {
    const eventTypeCustomInputs = [
      { id: 1, eventTypeId: 1, label: "Company", type: "TEXT", required: true, placeholder: "" },
    ];

    expect(() => handleCustomInputs(eventTypeCustomInputs as never, [])).toThrow();
  });

  it("validates required boolean inputs", () => {
    const eventTypeCustomInputs = [
      { id: 1, eventTypeId: 1, label: "Agree to TOS", type: "BOOL", required: true, placeholder: "" },
    ];
    const reqCustomInputs = [{ label: "Agree to TOS", value: true }];

    expect(() => handleCustomInputs(eventTypeCustomInputs as never, reqCustomInputs)).not.toThrow();
  });

  it("throws when required boolean is false", () => {
    const eventTypeCustomInputs = [
      { id: 1, eventTypeId: 1, label: "Agree to TOS", type: "BOOL", required: true, placeholder: "" },
    ];
    const reqCustomInputs = [{ label: "Agree to TOS", value: false }];

    expect(() => handleCustomInputs(eventTypeCustomInputs as never, reqCustomInputs)).toThrow();
  });

  it("validates required phone inputs", () => {
    const eventTypeCustomInputs = [
      { id: 1, eventTypeId: 1, label: "Phone", type: "PHONE", required: true, placeholder: "" },
    ];
    const reqCustomInputs = [{ label: "Phone", value: "+14155551234" }];

    expect(() => handleCustomInputs(eventTypeCustomInputs as never, reqCustomInputs)).not.toThrow();
  });

  it("throws for invalid phone number", () => {
    const eventTypeCustomInputs = [
      { id: 1, eventTypeId: 1, label: "Phone", type: "PHONE", required: true, placeholder: "" },
    ];
    const reqCustomInputs = [{ label: "Phone", value: "not-a-phone" }];

    expect(() => handleCustomInputs(eventTypeCustomInputs as never, reqCustomInputs)).toThrow();
  });

  it("skips validation for non-required inputs", () => {
    const eventTypeCustomInputs = [
      { id: 1, eventTypeId: 1, label: "Notes", type: "TEXTLONG", required: false, placeholder: "" },
    ];

    expect(() => handleCustomInputs(eventTypeCustomInputs as never, [])).not.toThrow();
  });
});

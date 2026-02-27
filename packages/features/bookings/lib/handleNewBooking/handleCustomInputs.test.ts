import type { EventTypeCustomInput } from "@calcom/prisma/client";
import { describe, expect, it } from "vitest";
import { handleCustomInputs } from "./handleCustomInputs";

function makeCustomInput(overrides: Partial<EventTypeCustomInput> = {}): EventTypeCustomInput {
  return {
    id: 1,
    eventTypeId: 1,
    label: "Company Name",
    type: "TEXT",
    required: true,
    placeholder: "",
    options: null,
    hasToBeCreated: true,
    ...overrides,
  } as EventTypeCustomInput;
}

describe("handleCustomInputs", () => {
  it("passes when all required inputs are provided", () => {
    const eventTypeInputs = [makeCustomInput({ label: "Company Name", required: true })];
    const reqInputs = [{ label: "Company Name", value: "Acme Corp" }];

    expect(() => handleCustomInputs(eventTypeInputs, reqInputs)).not.toThrow();
  });

  it("throws when a required TEXT input is missing", () => {
    const eventTypeInputs = [makeCustomInput({ label: "Company Name", required: true, type: "TEXT" })];
    const reqInputs: { label: string; value: string | boolean }[] = [];

    expect(() => handleCustomInputs(eventTypeInputs, reqInputs)).toThrow();
  });

  it("throws when a required TEXT input has empty value", () => {
    const eventTypeInputs = [makeCustomInput({ label: "Company Name", required: true, type: "TEXT" })];
    const reqInputs = [{ label: "Company Name", value: "" }];

    expect(() => handleCustomInputs(eventTypeInputs, reqInputs)).toThrow();
  });

  it("does not throw for non-required inputs that are missing", () => {
    const eventTypeInputs = [makeCustomInput({ label: "Notes", required: false, type: "TEXT" })];
    const reqInputs: { label: string; value: string | boolean }[] = [];

    expect(() => handleCustomInputs(eventTypeInputs, reqInputs)).not.toThrow();
  });

  it("throws when a required BOOL input is not true", () => {
    const eventTypeInputs = [makeCustomInput({ label: "Agree to Terms", required: true, type: "BOOL" })];
    const reqInputs = [{ label: "Agree to Terms", value: false }];

    expect(() => handleCustomInputs(eventTypeInputs, reqInputs)).toThrow();
  });

  it("passes when a required BOOL input is true", () => {
    const eventTypeInputs = [makeCustomInput({ label: "Agree to Terms", required: true, type: "BOOL" })];
    const reqInputs = [{ label: "Agree to Terms", value: true }];

    expect(() => handleCustomInputs(eventTypeInputs, reqInputs)).not.toThrow();
  });

  it("throws when a required PHONE input has an invalid phone number", () => {
    const eventTypeInputs = [makeCustomInput({ label: "Phone", required: true, type: "PHONE" })];
    const reqInputs = [{ label: "Phone", value: "not-a-phone" }];

    expect(() => handleCustomInputs(eventTypeInputs, reqInputs)).toThrow();
  });

  it("passes when a required PHONE input has a valid phone number", () => {
    const eventTypeInputs = [makeCustomInput({ label: "Phone", required: true, type: "PHONE" })];
    const reqInputs = [{ label: "Phone", value: "+14155552671" }];

    expect(() => handleCustomInputs(eventTypeInputs, reqInputs)).not.toThrow();
  });

  it("validates multiple required inputs", () => {
    const eventTypeInputs = [
      makeCustomInput({ id: 1, label: "Company", required: true, type: "TEXT" }),
      makeCustomInput({ id: 2, label: "Agree", required: true, type: "BOOL" }),
    ];
    const reqInputs = [
      { label: "Company", value: "Acme" },
      { label: "Agree", value: true },
    ];

    expect(() => handleCustomInputs(eventTypeInputs, reqInputs)).not.toThrow();
  });
});

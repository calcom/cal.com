import { describe, expect, it } from "vitest";

import type { FieldSource } from "@calcom/prisma/zod-utils";

import {
  CALAI_FIELD_TEMPLATE,
  type Fields,
  mergePhoneFieldSources,
  SMS_FIELD_TEMPLATE,
  splitPhoneFieldSources,
  SUB_TYPE_MAP,
  toggleUnifiedPhoneFields,
} from "./managePhoneFields";

function makeAttendeePhoneField(overrides: Record<string, unknown> = {}): Fields[number] {
  return {
    name: "attendeePhoneNumber",
    type: "phone",
    editable: "system-but-optional",
    sources: [],
    hidden: true,
    required: false,
    ...overrides,
  } as Fields[number];
}

function makeSmsField(sources: FieldSource[] = []): Fields[number] {
  return {
    ...SMS_FIELD_TEMPLATE,
    sources,
    required: false,
  } as Fields[number];
}

function makeCalAiField(sources: FieldSource[] = []): Fields[number] {
  return {
    ...CALAI_FIELD_TEMPLATE,
    sources,
    required: false,
  } as Fields[number];
}

function makeWorkflowSource(id: string, overrides: Partial<FieldSource> = {}): FieldSource {
  return {
    id,
    type: "workflow",
    label: `Workflow ${id}`,
    fieldRequired: false,
    ...overrides,
  } as FieldSource;
}

describe("SUB_TYPE_MAP", () => {
  it("maps smsReminderNumber to sms", () => {
    expect(SUB_TYPE_MAP.smsReminderNumber).toBe("sms");
  });

  it("maps aiAgentCallPhoneNumber to calai", () => {
    expect(SUB_TYPE_MAP.aiAgentCallPhoneNumber).toBe("calai");
  });
});

describe("mergePhoneFieldSources", () => {
  it("returns fields unchanged when no target and no sources to merge", () => {
    const fields: Fields = [{ name: "name", type: "name", editable: "system" } as Fields[number]];
    const result = mergePhoneFieldSources(fields);
    expect(result).toEqual(fields);
  });

  it("throws when target is missing but non-target fields have workflow sources", () => {
    const fields: Fields = [makeSmsField([makeWorkflowSource("wf-1")])];
    expect(() => mergePhoneFieldSources(fields)).toThrow("attendeePhoneNumber field is missing");
  });

  it("merges SMS workflow sources into attendeePhoneNumber", () => {
    const smsSource = makeWorkflowSource("wf-1");
    const fields: Fields = [makeAttendeePhoneField(), makeSmsField([smsSource])];
    const result = mergePhoneFieldSources(fields);

    const targetField = result.find((f) => f.name === "attendeePhoneNumber");
    expect(targetField).toBeDefined();
    expect(targetField!.sources!.some((s) => s.id === "wf-1" && s.subType === "sms")).toBe(true);

    // SMS field should be removed
    expect(result.find((f) => f.name === "smsReminderNumber")).toBeUndefined();
  });

  it("merges Cal.ai workflow sources into attendeePhoneNumber", () => {
    const calaiSource = makeWorkflowSource("wf-2");
    const fields: Fields = [makeAttendeePhoneField(), makeCalAiField([calaiSource])];
    const result = mergePhoneFieldSources(fields);

    const targetField = result.find((f) => f.name === "attendeePhoneNumber");
    expect(targetField!.sources!.some((s) => s.id === "wf-2" && s.subType === "calai")).toBe(true);

    // CalAi field should be removed
    expect(result.find((f) => f.name === "aiAgentCallPhoneNumber")).toBeUndefined();
  });

  it("sets hidden to false when workflow sources are merged", () => {
    const fields: Fields = [
      makeAttendeePhoneField({ hidden: true }),
      makeSmsField([makeWorkflowSource("wf-1")]),
    ];
    const result = mergePhoneFieldSources(fields);
    const targetField = result.find((f) => f.name === "attendeePhoneNumber");
    expect(targetField!.hidden).toBe(false);
  });

  it("sets required when source has fieldRequired", () => {
    const fields: Fields = [
      makeAttendeePhoneField(),
      makeSmsField([makeWorkflowSource("wf-1", { fieldRequired: true })]),
    ];
    const result = mergePhoneFieldSources(fields);
    const targetField = result.find((f) => f.name === "attendeePhoneNumber");
    expect(targetField!.required).toBe(true);
  });

  it("merges workflowDerivedSources into target", () => {
    const fields: Fields = [makeAttendeePhoneField()];
    const derivedSource = makeWorkflowSource("wf-derived", { subType: "sms" });
    const result = mergePhoneFieldSources(fields, [derivedSource]);

    const targetField = result.find((f) => f.name === "attendeePhoneNumber");
    expect(targetField!.sources!.some((s) => s.id === "wf-derived")).toBe(true);
  });

  it("deduplicates sources by id and subType", () => {
    const source = makeWorkflowSource("wf-1", { subType: "sms" });
    const fields: Fields = [makeAttendeePhoneField({ sources: [{ ...source }] }), makeSmsField([source])];
    const result = mergePhoneFieldSources(fields);
    const targetField = result.find((f) => f.name === "attendeePhoneNumber");
    const smsWorkflowSources = targetField!.sources!.filter(
      (s) => s.id === "wf-1" && s.subType === "sms"
    );
    expect(smsWorkflowSources.length).toBe(1);
  });
});

describe("splitPhoneFieldSources", () => {
  it("returns fields unchanged when no unified target exists", () => {
    const fields: Fields = [{ name: "name", type: "name", editable: "system" } as Fields[number]];
    expect(splitPhoneFieldSources(fields)).toEqual(fields);
  });

  it("returns fields unchanged when no sources have subTypes", () => {
    const fields: Fields = [
      makeAttendeePhoneField({ sources: [makeWorkflowSource("wf-1")] }),
    ];
    expect(splitPhoneFieldSources(fields)).toEqual(fields);
  });

  it("splits sms sources back to smsReminderNumber field", () => {
    const smsSource = makeWorkflowSource("wf-1", { subType: "sms" });
    const fields: Fields = [makeAttendeePhoneField({ sources: [smsSource] })];
    const result = splitPhoneFieldSources(fields);

    const smsField = result.find((f) => f.name === "smsReminderNumber");
    expect(smsField).toBeDefined();
    expect(smsField!.sources!.some((s) => s.id === "wf-1")).toBe(true);

    const targetField = result.find((f) => f.name === "attendeePhoneNumber");
    expect(targetField!.sources!.length).toBe(0);
  });

  it("splits calai sources back to aiAgentCallPhoneNumber field", () => {
    const calaiSource = makeWorkflowSource("wf-2", { subType: "calai" });
    const fields: Fields = [makeAttendeePhoneField({ sources: [calaiSource] })];
    const result = splitPhoneFieldSources(fields);

    const calaiField = result.find((f) => f.name === "aiAgentCallPhoneNumber");
    expect(calaiField).toBeDefined();
    expect(calaiField!.sources!.some((s) => s.id === "wf-2")).toBe(true);
  });

  it("keeps non-subType sources in unified field", () => {
    const regularSource = makeWorkflowSource("wf-regular");
    const smsSource = makeWorkflowSource("wf-sms", { subType: "sms" });
    const fields: Fields = [makeAttendeePhoneField({ sources: [regularSource, smsSource] })];
    const result = splitPhoneFieldSources(fields);

    const targetField = result.find((f) => f.name === "attendeePhoneNumber");
    expect(targetField!.sources!.some((s) => s.id === "wf-regular")).toBe(true);
    expect(targetField!.sources!.some((s) => s.id === "wf-sms")).toBe(false);
  });

  it("restores hidden state when no remaining workflow sources and system-but-optional", () => {
    const smsSource = makeWorkflowSource("wf-1", { subType: "sms" });
    const fields: Fields = [
      makeAttendeePhoneField({ sources: [smsSource], editable: "system-but-optional" }),
    ];
    const result = splitPhoneFieldSources(fields, true);
    const targetField = result.find((f) => f.name === "attendeePhoneNumber");
    expect(targetField!.hidden).toBe(true);
  });
});

describe("toggleUnifiedPhoneFields", () => {
  it("enables unified mode by merging sources", () => {
    const smsSource = makeWorkflowSource("wf-1");
    const fields: Fields = [
      makeAttendeePhoneField({ hidden: true }),
      makeSmsField([smsSource]),
    ];
    const { bookingFields, state } = toggleUnifiedPhoneFields({ enable: true, bookingFields: fields });

    expect(bookingFields.find((f) => f.name === "smsReminderNumber")).toBeUndefined();
    expect(state.attendeePhoneHidden).toBe(true);
  });

  it("disables unified mode by splitting sources", () => {
    const smsSource = makeWorkflowSource("wf-1", { subType: "sms" });
    const fields: Fields = [makeAttendeePhoneField({ sources: [smsSource] })];
    const previousState = { attendeePhoneHidden: true };
    const { bookingFields } = toggleUnifiedPhoneFields({
      enable: false,
      bookingFields: fields,
      previousState,
    });

    expect(bookingFields.find((f) => f.name === "smsReminderNumber")).toBeDefined();
  });
});

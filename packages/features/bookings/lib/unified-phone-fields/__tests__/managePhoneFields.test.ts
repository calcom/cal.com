import {
  ATTENDEE_PHONE_NUMBER_FIELD,
  CAL_AI_AGENT_PHONE_NUMBER_FIELD,
  SMS_REMINDER_NUMBER_FIELD,
} from "@calcom/lib/bookings/SystemField";
import { describe, expect, it } from "vitest";
import type { Fields } from "../managePhoneFields";
import { mergePhoneFieldSources, splitPhoneFieldSources, toggleUnifiedPhoneFields } from "../managePhoneFields";

type Field = Fields[number];
type FieldSource = NonNullable<Field["sources"]>[number];

const createWorkflowSource = (
  workflowId: number,
  overrides?: { fieldRequired?: boolean; subType?: "sms" | "calai" }
): FieldSource => ({
  id: `${workflowId}`,
  type: "workflow" as const,
  label: "Workflow",
  fieldRequired: overrides?.fieldRequired ?? false,
  editUrl: `/workflows/${workflowId}`,
  ...(overrides?.subType ? { subType: overrides.subType } : {}),
});

const createDefaultSource = (): FieldSource => ({
  id: "default",
  type: "default" as const,
  label: "Default",
});

const createAttendeePhoneField = (overrides?: {
  hidden?: boolean;
  sources?: FieldSource[];
  required?: boolean;
}): Field => ({
  name: ATTENDEE_PHONE_NUMBER_FIELD,
  type: "phone" as const,
  editable: "system-but-optional" as const,
  hidden: overrides?.hidden ?? true,
  sources: overrides?.sources ?? [createDefaultSource()],
  ...(overrides?.required !== undefined ? { required: overrides.required } : {}),
});

const createSmsReminderField = (overrides?: { sources?: FieldSource[]; required?: boolean }): Field => ({
  name: SMS_REMINDER_NUMBER_FIELD,
  type: "phone" as const,
  editable: "system" as const,
  sources: overrides?.sources ?? [createDefaultSource()],
  ...(overrides?.required !== undefined ? { required: overrides.required } : {}),
});

const createCalAiField = (overrides?: { sources?: FieldSource[]; required?: boolean }): Field => ({
  name: CAL_AI_AGENT_PHONE_NUMBER_FIELD,
  type: "phone" as const,
  editable: "system" as const,
  sources: overrides?.sources ?? [createDefaultSource()],
  ...(overrides?.required !== undefined ? { required: overrides.required } : {}),
});

const findField = ({ fields, name }: { fields: Fields; name: string }) => {
  return fields.find((f) => f.name === name);
};

const expectFieldExists = ({ fields, name }: { fields: Fields; name: string }) => {
  const field = findField({ fields, name });
  expect(field).toBeDefined();
  return field!;
};

const expectFieldNotExists = ({ fields, name }: { fields: Fields; name: string }) => {
  const field = findField({ fields, name });
  expect(field).toBeUndefined();
};

const expectFieldHasWorkflowSource = ({
  fields,
  name,
  subType,
}: {
  fields: Fields;
  name: string;
  subType: "sms" | "calai";
}) => {
  const field = findField({ fields, name });
  expect(field?.sources?.some((s) => s.type === "workflow" && s.subType === subType)).toBe(true);
};

const expectFieldHasWorkflowSources = ({ fields, name }: { fields: Fields; name: string }) => {
  const field = findField({ fields, name });
  expect(field?.sources?.some((s) => s.type === "workflow")).toBe(true);
};

const expectFieldDoesNotHaveWorkflowSubType = ({
  fields,
  name,
  subType,
}: {
  fields: Fields;
  name: string;
  subType: "sms" | "calai";
}) => {
  const field = findField({ fields, name });
  expect(field?.sources?.some((s) => s.subType === subType)).toBe(false);
};

const expectFieldHidden = ({ fields, name, hidden }: { fields: Fields; name: string; hidden: boolean }) => {
  const field = findField({ fields, name });
  expect(field?.hidden).toBe(hidden);
};

const expectFieldRequired = ({
  fields,
  name,
  required,
}: {
  fields: Fields;
  name: string;
  required: boolean;
}) => {
  const field = findField({ fields, name });
  expect(field?.required).toBe(required);
};

const expectFieldWorkflowSourceCount = ({
  fields,
  name,
  subType,
  count,
}: {
  fields: Fields;
  name: string;
  subType: "sms" | "calai";
  count: number;
}) => {
  const field = findField({ fields, name });
  const workflowSources = field?.sources?.filter((s) => s.type === "workflow" && s.subType === subType);
  expect(workflowSources).toHaveLength(count);
};

const expectFieldMatchesWorkflowId = ({
  fields,
  name,
  workflowId,
}: {
  fields: Fields;
  name: string;
  workflowId: string;
}) => {
  const field = findField({ fields, name });
  expect(field?.sources?.some((s) => s.id === workflowId && s.type === "workflow")).toBe(true);
};

const expectAttendeePhoneFieldExists = ({ fields }: { fields: Fields }) => {
  return expectFieldExists({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD });
};

const expectAttendeePhoneFieldHasWorkflowSource = ({
  fields,
  subType,
}: {
  fields: Fields;
  subType: "sms" | "calai";
}) => {
  expectFieldHasWorkflowSource({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD, subType });
};

const expectAttendeePhoneFieldDoesNotHaveWorkflowSubType = ({
  fields,
  subType,
}: {
  fields: Fields;
  subType: "sms" | "calai";
}) => {
  expectFieldDoesNotHaveWorkflowSubType({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD, subType });
};

const expectAttendeePhoneFieldHidden = ({ fields, hidden }: { fields: Fields; hidden: boolean }) => {
  expectFieldHidden({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD, hidden });
};

const expectAttendeePhoneFieldRequired = ({ fields, required }: { fields: Fields; required: boolean }) => {
  expectFieldRequired({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD, required });
};

const expectAttendeePhoneFieldWorkflowSourceCount = ({
  fields,
  subType,
  count,
}: {
  fields: Fields;
  subType: "sms" | "calai";
  count: number;
}) => {
  expectFieldWorkflowSourceCount({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD, subType, count });
};

const expectSmsFieldExists = ({ fields }: { fields: Fields }) => {
  return expectFieldExists({ fields, name: SMS_REMINDER_NUMBER_FIELD });
};

const expectSmsFieldNotExists = ({ fields }: { fields: Fields }) => {
  expectFieldNotExists({ fields, name: SMS_REMINDER_NUMBER_FIELD });
};

const expectSmsFieldHasWorkflowSource = ({
  fields,
  subType,
}: {
  fields: Fields;
  subType: "sms" | "calai";
}) => {
  expectFieldHasWorkflowSource({ fields, name: SMS_REMINDER_NUMBER_FIELD, subType });
};

const expectSmsFieldHasWorkflowSources = ({ fields }: { fields: Fields }) => {
  expectFieldHasWorkflowSources({ fields, name: SMS_REMINDER_NUMBER_FIELD });
};

const expectSmsFieldRequired = ({ fields, required }: { fields: Fields; required: boolean }) => {
  expectFieldRequired({ fields, name: SMS_REMINDER_NUMBER_FIELD, required });
};

const expectSmsFieldMatchesWorkflowId = ({ fields, workflowId }: { fields: Fields; workflowId: string }) => {
  expectFieldMatchesWorkflowId({ fields, name: SMS_REMINDER_NUMBER_FIELD, workflowId });
};

const expectCalAiFieldExists = ({ fields }: { fields: Fields }) => {
  return expectFieldExists({ fields, name: CAL_AI_AGENT_PHONE_NUMBER_FIELD });
};

const expectCalAiFieldNotExists = ({ fields }: { fields: Fields }) => {
  expectFieldNotExists({ fields, name: CAL_AI_AGENT_PHONE_NUMBER_FIELD });
};

const expectCalAiFieldHasWorkflowSource = ({
  fields,
  subType,
}: {
  fields: Fields;
  subType: "sms" | "calai";
}) => {
  expectFieldHasWorkflowSource({ fields, name: CAL_AI_AGENT_PHONE_NUMBER_FIELD, subType });
};

const expectCalAiFieldMatchesWorkflowId = ({
  fields,
  workflowId,
}: {
  fields: Fields;
  workflowId: string;
}) => {
  expectFieldMatchesWorkflowId({ fields, name: CAL_AI_AGENT_PHONE_NUMBER_FIELD, workflowId });
};

describe("mergePhoneFieldSources", () => {
  describe("when merging SMS workflow sources", () => {
    it("should merge smsReminderNumber sources into attendeePhoneNumber and remove smsReminderNumber field", () => {
      const fields: Fields = [
        createAttendeePhoneField({ hidden: true }),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1, { fieldRequired: true })],
          required: true,
        }),
      ];

      const result = mergePhoneFieldSources(fields);

      expectSmsFieldNotExists({ fields: result });
      expectAttendeePhoneFieldExists({ fields: result });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldHidden({ fields: result, hidden: false });
      expectAttendeePhoneFieldRequired({ fields: result, required: true });
    });

    it("should mark attendeePhoneNumber as required when SMS workflow source requires field", () => {
      const fields: Fields = [
        createAttendeePhoneField(),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1, { fieldRequired: true })],
        }),
      ];

      const result = mergePhoneFieldSources(fields);

      expectAttendeePhoneFieldRequired({ fields: result, required: true });
    });
  });

  describe("when merging Cal.ai workflow sources", () => {
    it("should merge aiAgentCallPhoneNumber sources into attendeePhoneNumber and remove aiAgentCallPhoneNumber field", () => {
      const fields: Fields = [
        createAttendeePhoneField({ hidden: true }),
        createCalAiField({
          sources: [createDefaultSource(), createWorkflowSource(2)],
        }),
      ];

      const result = mergePhoneFieldSources(fields);

      expectCalAiFieldNotExists({ fields: result });
      expectAttendeePhoneFieldExists({ fields: result });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "calai" });
      expectAttendeePhoneFieldHidden({ fields: result, hidden: false });
    });
  });

  describe("when merging multiple workflow sources", () => {
    it("should merge both SMS and Cal.ai sources into attendeePhoneNumber", () => {
      const fields: Fields = [
        createAttendeePhoneField({ hidden: true }),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1, { fieldRequired: true })],
        }),
        createCalAiField({
          sources: [createDefaultSource(), createWorkflowSource(2)],
        }),
      ];

      const result = mergePhoneFieldSources(fields);

      expectSmsFieldNotExists({ fields: result });
      expectCalAiFieldNotExists({ fields: result });
      expectAttendeePhoneFieldExists({ fields: result });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "calai" });
    });

    it("should deduplicate sources with same id and subType", () => {
      const duplicateSource = createWorkflowSource(1, { subType: "sms" });
      const fields: Fields = [
        createAttendeePhoneField({
          sources: [createDefaultSource(), duplicateSource],
        }),
        createSmsReminderField({
          sources: [createDefaultSource(), duplicateSource],
        }),
      ];

      const result = mergePhoneFieldSources(fields);

      expectAttendeePhoneFieldWorkflowSourceCount({ fields: result, subType: "sms", count: 1 });
    });
  });

  describe("when attendeePhoneNumber field is missing", () => {
    it("should throw error when non-target fields have workflow sources that need merging", () => {
      const fields: Fields = [
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1)],
        }),
      ];

      expect(() => mergePhoneFieldSources(fields)).toThrow(
        "Cannot merge phone field sources: attendeePhoneNumber field is missing but non-target phone fields with workflow sources exist"
      );
    });

    it("should return fields unchanged when there is nothing to merge", () => {
      const fields: Fields = [
        createSmsReminderField({
          sources: [createDefaultSource()],
        }),
      ];

      const result = mergePhoneFieldSources(fields);

      expect(result).toHaveLength(1);
      expectSmsFieldExists({ fields: result });
    });

    it("should return empty fields unchanged when there is nothing to merge", () => {
      const fields: Fields = [];

      const result = mergePhoneFieldSources(fields);

      expect(result).toHaveLength(0);
    });
  });

  describe("when non-target fields have no workflow sources", () => {
    it("should not remove non-target fields that only have default sources", () => {
      const fields: Fields = [
        createAttendeePhoneField(),
        createSmsReminderField({
          sources: [createDefaultSource()],
        }),
      ];

      const result = mergePhoneFieldSources(fields);

      expect(result).toHaveLength(2);
      expectAttendeePhoneFieldExists({ fields: result });
      expectSmsFieldExists({ fields: result });
    });

    it("should remove only non-target fields that have workflow sources, keeping ones without", () => {
      const fields: Fields = [
        createAttendeePhoneField({ hidden: true }),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1)],
        }),
        createCalAiField({
          sources: [createDefaultSource()],
        }),
      ];

      const result = mergePhoneFieldSources(fields);

      expectSmsFieldNotExists({ fields: result });
      expectCalAiFieldExists({ fields: result });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
    });
  });

  describe("when testing data immutability", () => {
    it("should not mutate the original input array", () => {
      const original: Fields = [
        createAttendeePhoneField(),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1)],
        }),
      ];

      const originalLength = original.length;
      mergePhoneFieldSources(original);

      expect(original).toHaveLength(originalLength);
      expectSmsFieldExists({ fields: original });
    });
  });

  describe("when using workflowDerivedSources parameter", () => {
    it("should merge workflow-derived sources into attendeePhoneNumber", () => {
      const fields: Fields = [createAttendeePhoneField({ hidden: true })];

      const workflowDerivedSources: FieldSource[] = [
        {
          id: "10",
          type: "workflow" as const,
          label: "SMS Workflow",
          fieldRequired: true,
          editUrl: "/workflows/10",
          subType: "sms",
        },
      ];

      const result = mergePhoneFieldSources(fields, workflowDerivedSources);

      expectAttendeePhoneFieldExists({ fields: result });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldHidden({ fields: result, hidden: false });
      expectAttendeePhoneFieldRequired({ fields: result, required: true });
    });

    it("should merge multiple workflow-derived sources (SMS and Cal.ai)", () => {
      const fields: Fields = [createAttendeePhoneField({ hidden: true })];

      const workflowDerivedSources: FieldSource[] = [
        {
          id: "20",
          type: "workflow" as const,
          label: "SMS Workflow",
          fieldRequired: false,
          editUrl: "/workflows/20",
          subType: "sms",
        },
        {
          id: "30",
          type: "workflow" as const,
          label: "Cal.ai Workflow",
          fieldRequired: true,
          editUrl: "/workflows/30",
          subType: "calai",
        },
      ];

      const result = mergePhoneFieldSources(fields, workflowDerivedSources);

      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "calai" });
      expectAttendeePhoneFieldRequired({ fields: result, required: true });
    });

    it("should deduplicate workflow-derived sources with existing field sources", () => {
      const existingSource: FieldSource = {
        id: "10",
        type: "workflow" as const,
        label: "SMS Workflow",
        fieldRequired: false,
        editUrl: "/workflows/10",
        subType: "sms",
      };

      const fields: Fields = [
        createAttendeePhoneField({
          sources: [createDefaultSource(), existingSource],
        }),
      ];

      const workflowDerivedSources: FieldSource[] = [existingSource];

      const result = mergePhoneFieldSources(fields, workflowDerivedSources);

      expectAttendeePhoneFieldWorkflowSourceCount({ fields: result, subType: "sms", count: 1 });
    });

    it("should propagate fieldRequired from workflow-derived sources", () => {
      const fields: Fields = [createAttendeePhoneField({ hidden: true })];

      const workflowDerivedSources: FieldSource[] = [
        {
          id: "40",
          type: "workflow" as const,
          label: "Required Workflow",
          fieldRequired: true,
          editUrl: "/workflows/40",
          subType: "sms",
        },
      ];

      const result = mergePhoneFieldSources(fields, workflowDerivedSources);

      expectAttendeePhoneFieldRequired({ fields: result, required: true });
    });

    it("should not set required when no workflow-derived source requires it", () => {
      const fields: Fields = [createAttendeePhoneField({ hidden: true })];

      const workflowDerivedSources: FieldSource[] = [
        {
          id: "50",
          type: "workflow" as const,
          label: "Optional Workflow",
          fieldRequired: false,
          editUrl: "/workflows/50",
          subType: "calai",
        },
      ];

      const result = mergePhoneFieldSources(fields, workflowDerivedSources);

      const field = findField({ fields: result, name: ATTENDEE_PHONE_NUMBER_FIELD });
      expect(field?.required).toBeFalsy();
    });

    it("should combine field-based and workflow-derived sources correctly", () => {
      const fields: Fields = [
        createAttendeePhoneField({ hidden: true }),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1, { fieldRequired: false })],
        }),
      ];

      const workflowDerivedSources: FieldSource[] = [
        {
          id: "70",
          type: "workflow" as const,
          label: "Cal.ai Workflow",
          fieldRequired: true,
          editUrl: "/workflows/70",
          subType: "calai",
        },
      ];

      const result = mergePhoneFieldSources(fields, workflowDerivedSources);

      expectSmsFieldNotExists({ fields: result });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "calai" });
      expectAttendeePhoneFieldRequired({ fields: result, required: true });
    });

    it("should default to empty array when workflowDerivedSources is not provided", () => {
      const fields: Fields = [
        createAttendeePhoneField({ hidden: true }),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1)],
        }),
      ];

      const result = mergePhoneFieldSources(fields);

      expectSmsFieldNotExists({ fields: result });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
    });
  });
});

describe("splitPhoneFieldSources", () => {
  describe("when splitting SMS sources from attendeePhoneNumber", () => {
    it("should move SMS-subTyped sources to a new smsReminderNumber field", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource(), createWorkflowSource(1, { subType: "sms", fieldRequired: true })],
        }),
      ];

      const result = splitPhoneFieldSources(fields);

      expectSmsFieldExists({ fields: result });
      expectSmsFieldHasWorkflowSources({ fields: result });
      expectAttendeePhoneFieldExists({ fields: result });
      expectAttendeePhoneFieldDoesNotHaveWorkflowSubType({ fields: result, subType: "sms" });
    });

    it("should propagate fieldRequired to the new SMS field's required property", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource(), createWorkflowSource(1, { subType: "sms", fieldRequired: true })],
        }),
      ];

      const result = splitPhoneFieldSources(fields);

      expectSmsFieldRequired({ fields: result, required: true });
    });
  });

  describe("when splitting Cal.ai sources from attendeePhoneNumber", () => {
    it("should move calai-subTyped sources to a new aiAgentCallPhoneNumber field", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource(), createWorkflowSource(2, { subType: "calai" })],
        }),
      ];

      const result = splitPhoneFieldSources(fields);

      expectCalAiFieldExists({ fields: result });
      expectAttendeePhoneFieldExists({ fields: result });
      expectAttendeePhoneFieldDoesNotHaveWorkflowSubType({ fields: result, subType: "calai" });
    });
  });

  describe("when splitting both SMS and Cal.ai sources simultaneously", () => {
    it("should create separate fields for each subType", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [
            createDefaultSource(),
            createWorkflowSource(1, { subType: "sms", fieldRequired: true }),
            createWorkflowSource(2, { subType: "calai" }),
          ],
        }),
      ];

      const result = splitPhoneFieldSources(fields);

      expectSmsFieldExists({ fields: result });
      expectCalAiFieldExists({ fields: result });
      expectAttendeePhoneFieldExists({ fields: result });
      expectAttendeePhoneFieldDoesNotHaveWorkflowSubType({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldDoesNotHaveWorkflowSubType({ fields: result, subType: "calai" });
    });
  });

  describe("when restoring hidden state via unifiedFieldOrigHidden parameter", () => {
    it("should restore hidden state when unifiedFieldOrigHidden is provided", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource(), createWorkflowSource(1, { subType: "sms" })],
        }),
      ];

      const result = splitPhoneFieldSources(fields, true);

      expectAttendeePhoneFieldHidden({ fields: result, hidden: true });
    });

    it("should keep attendeePhoneNumber visible when remaining workflow sources exist", () => {
      const nonSubTypedWorkflowSource = createWorkflowSource(99);
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [
            createDefaultSource(),
            nonSubTypedWorkflowSource,
            createWorkflowSource(1, { subType: "sms" }),
          ],
        }),
      ];

      const result = splitPhoneFieldSources(fields, true);

      // Still has non-subTyped workflow source, so should stay visible
      const attendeeField = findField({ fields: result, name: ATTENDEE_PHONE_NUMBER_FIELD });
      expect(attendeeField?.hidden).not.toBe(true);
    });

    it("should default to hidden: true when unifiedFieldOrigHidden is not provided and no remaining workflow sources", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource(), createWorkflowSource(1, { subType: "sms" })],
        }),
      ];

      const result = splitPhoneFieldSources(fields);

      // Without unifiedFieldOrigHidden, should default to hidden: true for server-side callers
      const attendeeField = findField({ fields: result, name: ATTENDEE_PHONE_NUMBER_FIELD });
      expect(attendeeField?.hidden).toBe(true);
    });
  });

  describe("when merging into existing SMS/CalAi fields", () => {
    it("should merge sources into existing smsReminderNumber field instead of creating new one", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource(), createWorkflowSource(1, { subType: "sms" })],
        }),
        createSmsReminderField({
          sources: [createDefaultSource()],
        }),
      ];

      const result = splitPhoneFieldSources(fields);

      expectSmsFieldExists({ fields: result });
      expectSmsFieldHasWorkflowSources({ fields: result });
      // Should not duplicate the SMS field
      const smsFields = result.filter((f) => f.name === SMS_REMINDER_NUMBER_FIELD);
      expect(smsFields).toHaveLength(1);
    });

    it("should deduplicate when source already exists on the target field", () => {
      const sharedSource = createWorkflowSource(1, { subType: "sms" });
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource(), sharedSource],
        }),
        createSmsReminderField({
          sources: [createDefaultSource(), { ...sharedSource }],
        }),
      ];

      const result = splitPhoneFieldSources(fields);

      const smsField = findField({ fields: result, name: SMS_REMINDER_NUMBER_FIELD });
      const workflowSources = smsField?.sources?.filter((s) => s.type === "workflow");
      expect(workflowSources).toHaveLength(1);
    });
  });

  describe("when attendeePhoneNumber has no subTyped sources", () => {
    it("should return fields unchanged (no-op)", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource()],
        }),
      ];

      const result = splitPhoneFieldSources(fields);

      expect(result).toHaveLength(1);
      expectAttendeePhoneFieldExists({ fields: result });
      expectSmsFieldNotExists({ fields: result });
      expectCalAiFieldNotExists({ fields: result });
    });
  });

  describe("when attendeePhoneNumber field is missing", () => {
    it("should return fields unchanged (no-op)", () => {
      const fields: Fields = [
        createSmsReminderField({ sources: [createDefaultSource()] }),
      ];

      const result = splitPhoneFieldSources(fields);

      expect(result).toEqual(fields);
    });
  });
});

describe("immutability", () => {
  it("mergePhoneFieldSources should not mutate the original bookingFields array", () => {
    const smsSource = createWorkflowSource(1, { subType: "sms" });
    const fields: Fields = [
      createAttendeePhoneField({ hidden: true }),
      createSmsReminderField({ sources: [createDefaultSource(), smsSource] }),
    ];

    const originalLength = fields.length;
    const originalFirstField = fields[0];
    const originalSecondField = fields[1];

    const result = mergePhoneFieldSources(fields);

    // The original array elements should not have been replaced in-place
    expect(fields).toHaveLength(originalLength);
    expect(fields[0]).toBe(originalFirstField);
    expect(fields[1]).toBe(originalSecondField);
    // The result should be a different array reference
    expect(result).not.toBe(fields);
  });

  it("splitPhoneFieldSources should not mutate the original bookingFields array", () => {
    const fields: Fields = [
      createAttendeePhoneField({
        sources: [createDefaultSource(), createWorkflowSource(1, { subType: "sms" })],
      }),
    ];

    const originalLength = fields.length;
    const originalFirstField = fields[0];

    const result = splitPhoneFieldSources(fields);

    // The result should be a different array reference
    expect(result).not.toBe(fields);
    // The original array should not have been modified (no push from splitSourcesToTargetField)
    expect(fields).toHaveLength(originalLength);
    // The original element should not have been replaced in-place
    expect(fields[0]).toBe(originalFirstField);
  });

  it("splitPhoneFieldSources should not mutate existing target field's sources array when merging into it", () => {
    const existingSmsFieldSources = [createDefaultSource()];
    const fields: Fields = [
      createAttendeePhoneField({
        hidden: false,
        sources: [createDefaultSource(), createWorkflowSource(1, { subType: "sms" })],
      }),
      createSmsReminderField({
        sources: existingSmsFieldSources,
      }),
    ];

    const originalSourcesLength = existingSmsFieldSources.length;

    splitPhoneFieldSources(fields);

    // The original smsReminderNumber field's sources array must not have been mutated
    expect(existingSmsFieldSources).toHaveLength(originalSourcesLength);
  });
});

describe("toggleUnifiedPhoneFields", () => {
  describe("when enabling (merging)", () => {
    it("should capture hidden state and return merged fields", () => {
      const fields: Fields = [
        createAttendeePhoneField({ hidden: true }),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1, { fieldRequired: true })],
        }),
      ];

      const result = toggleUnifiedPhoneFields({ enable: true, bookingFields: fields });

      expect(result.state.attendeePhoneHidden).toBe(true);
      expectSmsFieldNotExists({ fields: result.bookingFields });
      expectAttendeePhoneFieldExists({ fields: result.bookingFields });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result.bookingFields, subType: "sms" });
    });

    it("should capture hidden=false when attendee field is visible", () => {
      const fields: Fields = [
        createAttendeePhoneField({ hidden: false }),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1)],
        }),
      ];

      const result = toggleUnifiedPhoneFields({ enable: true, bookingFields: fields });

      expect(result.state.attendeePhoneHidden).toBe(false);
    });

    it("should default attendeePhoneHidden to true when attendee field is missing", () => {
      const fields: Fields = [
        createSmsReminderField({
          sources: [createDefaultSource()],
        }),
      ];

      const result = toggleUnifiedPhoneFields({ enable: true, bookingFields: fields });

      expect(result.state.attendeePhoneHidden).toBe(true);
    });
  });

  describe("when disabling (splitting)", () => {
    it("should split and restore hidden state from previousState", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource(), createWorkflowSource(1, { subType: "sms" })],
        }),
      ];

      const result = toggleUnifiedPhoneFields({
        enable: false,
        bookingFields: fields,
        previousState: { attendeePhoneHidden: true },
      });

      expectSmsFieldExists({ fields: result.bookingFields });
      expectAttendeePhoneFieldHidden({ fields: result.bookingFields, hidden: true });
      expect(result.state.attendeePhoneHidden).toBe(true);
    });

    it("should fall back gracefully without previousState", () => {
      const fields: Fields = [
        createAttendeePhoneField({
          hidden: false,
          sources: [createDefaultSource(), createWorkflowSource(1, { subType: "sms" })],
        }),
      ];

      const result = toggleUnifiedPhoneFields({
        enable: false,
        bookingFields: fields,
      });

      expectSmsFieldExists({ fields: result.bookingFields });
      expect(result.state.attendeePhoneHidden).toBeUndefined();
    });
  });

  describe("round-trip (enable → disable)", () => {
    it("should restore original structure after enable then disable with captured state", () => {
      const fields: Fields = [
        createAttendeePhoneField({ hidden: true }),
        createSmsReminderField({
          sources: [createDefaultSource(), createWorkflowSource(1, { fieldRequired: true })],
          required: true,
        }),
        createCalAiField({
          sources: [createDefaultSource(), createWorkflowSource(2)],
        }),
      ];

      const enableResult = toggleUnifiedPhoneFields({
        enable: true,
        bookingFields: [...fields.map((f) => ({ ...f }))],
      });

      expectSmsFieldNotExists({ fields: enableResult.bookingFields });
      expectCalAiFieldNotExists({ fields: enableResult.bookingFields });

      const disableResult = toggleUnifiedPhoneFields({
        enable: false,
        bookingFields: enableResult.bookingFields,
        previousState: enableResult.state,
      });

      expectSmsFieldExists({ fields: disableResult.bookingFields });
      expectCalAiFieldExists({ fields: disableResult.bookingFields });
      expectAttendeePhoneFieldHidden({ fields: disableResult.bookingFields, hidden: true });
      expectAttendeePhoneFieldDoesNotHaveWorkflowSubType({
        fields: disableResult.bookingFields,
        subType: "sms",
      });
      expectAttendeePhoneFieldDoesNotHaveWorkflowSubType({
        fields: disableResult.bookingFields,
        subType: "calai",
      });
    });
  });
});

describe("merge → split round-trip", () => {
  it("should restore separate fields after merge then split", () => {
    const smsSource = createWorkflowSource(1, { subType: "sms", fieldRequired: true });
    const calaiSource = createWorkflowSource(2, { subType: "calai" });

    const original: Fields = [
      createAttendeePhoneField({ hidden: true }),
      createSmsReminderField({
        sources: [createDefaultSource(), smsSource],
        required: true,
      }),
      createCalAiField({
        sources: [createDefaultSource(), calaiSource],
      }),
    ];

    // Stash original hidden state before merge (simulating UI layer)
    const unifiedFieldOrigHidden = original[0].hidden ?? true;
    const merged = mergePhoneFieldSources([...original.map((f) => ({ ...f }))]);

    expectSmsFieldNotExists({ fields: merged });
    expectCalAiFieldNotExists({ fields: merged });
    expectAttendeePhoneFieldHasWorkflowSource({ fields: merged, subType: "sms" });
    expectAttendeePhoneFieldHasWorkflowSource({ fields: merged, subType: "calai" });

    const split = splitPhoneFieldSources(merged, unifiedFieldOrigHidden);

    expectSmsFieldExists({ fields: split });
    expectCalAiFieldExists({ fields: split });
    expectAttendeePhoneFieldDoesNotHaveWorkflowSubType({ fields: split, subType: "sms" });
    expectAttendeePhoneFieldDoesNotHaveWorkflowSubType({ fields: split, subType: "calai" });
    expectAttendeePhoneFieldHidden({ fields: split, hidden: true });
  });

  it("should preserve workflow source ids through round-trip", () => {
    const fields: Fields = [
      createAttendeePhoneField({ hidden: true }),
      createSmsReminderField({
        sources: [createDefaultSource(), createWorkflowSource(42, { subType: "sms" })],
      }),
    ];

    const merged = mergePhoneFieldSources([...fields.map((f) => ({ ...f }))]);
    const split = splitPhoneFieldSources(merged, true);

    expectSmsFieldMatchesWorkflowId({ fields: split, workflowId: "42" });
  });
});

import {
  ATTENDEE_PHONE_NUMBER_FIELD,
  CAL_AI_AGENT_PHONE_NUMBER_FIELD,
  SMS_REMINDER_NUMBER_FIELD,
} from "@calcom/lib/bookings/SystemField";
import { describe, expect, it } from "vitest";
import type { Fields } from "./getBookingFields";
import { ensureBookingInputsHaveSystemFields } from "./getBookingFields";

type Field = Fields[number];
type FieldSource = NonNullable<Field["sources"]>[number];
type EnsureFieldsArgs = Parameters<typeof ensureBookingInputsHaveSystemFields>[0];
type WorkflowStep = NonNullable<EnsureFieldsArgs["workflows"]>[number]["workflow"]["steps"][number];
type Workflow = NonNullable<EnsureFieldsArgs["workflows"]>[number]["workflow"];

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
  type: "phone",
  editable: "system-but-optional",
  hidden: overrides?.hidden ?? true,
  sources: overrides?.sources ?? [createDefaultSource()],
  ...(overrides?.required !== undefined ? { required: overrides.required } : {}),
});

const createSmsReminderField = (overrides?: { sources?: FieldSource[]; required?: boolean }): Field => ({
  name: SMS_REMINDER_NUMBER_FIELD,
  type: "phone",
  editable: "system-but-optional",
  sources: overrides?.sources ?? [createDefaultSource()],
  ...(overrides?.required !== undefined ? { required: overrides.required } : {}),
});

const createCalAiField = (overrides?: { sources?: FieldSource[]; required?: boolean }): Field => ({
  name: CAL_AI_AGENT_PHONE_NUMBER_FIELD,
  type: "phone",
  editable: "system-but-optional",
  sources: overrides?.sources ?? [createDefaultSource()],
  ...(overrides?.required !== undefined ? { required: overrides.required } : {}),
});

const createSmsWorkflowStep = (overrides?: { numberRequired?: boolean }): WorkflowStep => ({
  action: "SMS_ATTENDEE",
  numberRequired: overrides?.numberRequired ?? false,
});

const createCalAiWorkflowStep = (overrides?: { numberRequired?: boolean }): WorkflowStep => ({
  action: "CAL_AI_PHONE_CALL",
  numberRequired: overrides?.numberRequired ?? false,
});

const createWorkflow = (
  workflowId: number,
  overrides?: {
    name?: string;
    steps?: WorkflowStep[];
  }
): Workflow => ({
  id: workflowId,
  name: overrides?.name ?? `Workflow ${workflowId}`,
  steps: overrides?.steps ?? [],
});

const createWorkflowWithSteps = ({ workflowId, steps }: { workflowId: number; steps: WorkflowStep[] }) => ({
  workflow: createWorkflow(workflowId, { steps }),
});

const createBaseTestArgs = (overrides?: Partial<EnsureFieldsArgs>): EnsureFieldsArgs => ({
  disableGuests: false,
  isOrgTeamEvent: false,
  additionalNotesRequired: false,
  customInputs: [],
  workflows: [],
  bookingFields: [],
  shouldMergePhoneSystemFields: true,
  ...overrides,
});

const findField = ({ fields, name }: { fields: Fields; name: string }) => {
  return fields.find((f) => f.name === name);
};

const expectFieldExists = ({ fields, name }: { fields: Fields; name: string }) => {
  const field = findField({ fields, name });
  expect(field).toBeDefined();
  return field!;
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
  count,
}: {
  fields: Fields;
  name: string;
  count: number;
}) => {
  const field = findField({ fields, name });
  expect(field?.sources?.filter((s) => s.type === "workflow")).toHaveLength(count);
};

const expectFieldSourcesHaveNoSubTypes = ({ fields, name }: { fields: Fields; name: string }) => {
  const field = findField({ fields, name });
  expect(field?.sources?.filter((s) => s.subType)).toHaveLength(0);
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

const expectAttendeePhoneFieldHidden = ({ fields, hidden }: { fields: Fields; hidden: boolean }) => {
  expectFieldHidden({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD, hidden });
};

const expectAttendeePhoneFieldRequired = ({ fields, required }: { fields: Fields; required: boolean }) => {
  expectFieldRequired({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD, required });
};

const expectAttendeePhoneFieldWorkflowSourceCount = ({
  fields,
  count,
}: {
  fields: Fields;
  count: number;
}) => {
  expectFieldWorkflowSourceCount({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD, count });
};

const expectAttendeePhoneFieldSourcesHaveNoSubTypes = ({ fields }: { fields: Fields }) => {
  expectFieldSourcesHaveNoSubTypes({ fields, name: ATTENDEE_PHONE_NUMBER_FIELD });
};

const expectSmsFieldExists = ({ fields }: { fields: Fields }) => {
  return expectFieldExists({ fields, name: SMS_REMINDER_NUMBER_FIELD });
};


describe("ensureBookingInputsHaveSystemFields - phone field unification", () => {
  describe("attendeePhoneNumber field presence guarantee", () => {
    it("should always have attendeePhoneNumber defined regardless of database state", () => {
      // Test 1: Empty bookingFields
      const emptyFieldsResult = ensureBookingInputsHaveSystemFields(
        createBaseTestArgs({
          bookingFields: [],
        })
      );
      expectAttendeePhoneFieldExists({ fields: emptyFieldsResult });

      // Test 2: bookingFields with only other fields
      const otherFieldsResult = ensureBookingInputsHaveSystemFields(
        createBaseTestArgs({
          bookingFields: [
            {
              name: "customField",
              type: "text",
              editable: "user",
              sources: [createDefaultSource()],
            },
          ],
        })
      );
      expectAttendeePhoneFieldExists({ fields: otherFieldsResult });

      // Test 3: bookingFields with SMS and Cal.ai fields but no attendeePhoneNumber
      const legacyFieldsResult = ensureBookingInputsHaveSystemFields(
        createBaseTestArgs({
          bookingFields: [createSmsReminderField(), createCalAiField()],
        })
      );
      expectAttendeePhoneFieldExists({ fields: legacyFieldsResult });

      // Test 4: With workflows but empty bookingFields
      const withWorkflowsResult = ensureBookingInputsHaveSystemFields(
        createBaseTestArgs({
          bookingFields: [],
          workflows: [createWorkflowWithSteps({ workflowId: 1, steps: [createSmsWorkflowStep()] })],
        })
      );
      expectAttendeePhoneFieldExists({ fields: withWorkflowsResult });
    });
  });

  describe("when deriving sources from active workflows", () => {
    it("should apply SMS workflow-derived sources even when not persisted in database", () => {
      const testArgs = createBaseTestArgs({
        bookingFields: [createAttendeePhoneField({ hidden: true })],
        workflows: [
          createWorkflowWithSteps({
            workflowId: 42,
            steps: [createSmsWorkflowStep({ numberRequired: true })],
          }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldHidden({ fields: result, hidden: false });
      expectAttendeePhoneFieldRequired({ fields: result, required: true });
    });

    it("should apply Cal.ai workflow-derived sources even when not persisted in database", () => {
      const testArgs = createBaseTestArgs({
        bookingFields: [createAttendeePhoneField({ hidden: true })],
        workflows: [
          createWorkflowWithSteps({
            workflowId: 77,
            steps: [createCalAiWorkflowStep({ numberRequired: false })],
          }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "calai" });
      expectAttendeePhoneFieldHidden({ fields: result, hidden: false });
    });

    it("should apply both SMS and Cal.ai workflow-derived sources simultaneously", () => {
      const testArgs = createBaseTestArgs({
        bookingFields: [createAttendeePhoneField({ hidden: true })],
        workflows: [
          createWorkflowWithSteps({
            workflowId: 10,
            steps: [createSmsWorkflowStep({ numberRequired: true })],
          }),
          createWorkflowWithSteps({
            workflowId: 20,
            steps: [createCalAiWorkflowStep({ numberRequired: false })],
          }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "calai" });
      expectAttendeePhoneFieldRequired({ fields: result, required: true });
    });
  });

  describe("when fixing old sources format (no subType) in unified mode", () => {
    it("should tag old-format SMS workflow sources with subType 'sms' when merging from smsReminderNumber", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: true,
        bookingFields: [
          createAttendeePhoneField({ hidden: true }),
          // Old DB state: smsReminderNumber has a workflow source WITHOUT subType
          createSmsReminderField({
            sources: [createDefaultSource(), createWorkflowSource(1)],
          }),
        ],
        workflows: [],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      // The old source should be merged into attendeePhoneNumber WITH subType "sms"
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldHidden({ fields: result, hidden: false });
    });

    it("should tag old-format calAI workflow sources with subType 'calai' when merging from calAiAgentNumber", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: true,
        bookingFields: [
          createAttendeePhoneField({ hidden: true }),
          // Old DB state: calAiAgentNumber has a workflow source WITHOUT subType
          createCalAiField({
            sources: [createDefaultSource(), createWorkflowSource(5)],
          }),
        ],
        workflows: [],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      // The old source should be merged into attendeePhoneNumber WITH subType "calai"
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "calai" });
      expectAttendeePhoneFieldHidden({ fields: result, hidden: false });
    });

    it("should tag old-format sources from both SMS and calAI fields when merging simultaneously", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: true,
        bookingFields: [
          createAttendeePhoneField({ hidden: true }),
          // Both non-target fields have old-format workflow sources (no subType)
          createSmsReminderField({
            sources: [createDefaultSource(), createWorkflowSource(1)],
          }),
          createCalAiField({
            sources: [createDefaultSource(), createWorkflowSource(2)],
          }),
        ],
        workflows: [],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "calai" });
      expectAttendeePhoneFieldWorkflowSourceCount({ fields: result, count: 2 });
    });

    it("should preserve fieldRequired from old-format sources during merge", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: true,
        bookingFields: [
          createAttendeePhoneField({ hidden: true }),
          createSmsReminderField({
            sources: [createDefaultSource(), createWorkflowSource(1, { fieldRequired: true })],
          }),
        ],
        workflows: [],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      expectAttendeePhoneFieldRequired({ fields: result, required: true });
      expectAttendeePhoneFieldHasWorkflowSource({ fields: result, subType: "sms" });
    });
  });

  describe("when testing idempotency", () => {
    it("should produce the same result when run twice", () => {
      const testArgs = createBaseTestArgs({
        bookingFields: [
          createSmsReminderField({
            sources: [createDefaultSource(), createWorkflowSource(1)],
          }),
        ],
      });

      const result1 = ensureBookingInputsHaveSystemFields(testArgs);
      const result2 = ensureBookingInputsHaveSystemFields({
        ...testArgs,
        bookingFields: [...result1],
      });

      expectAttendeePhoneFieldWorkflowSourceCount({ fields: result1, count: 1 });
      expectAttendeePhoneFieldWorkflowSourceCount({ fields: result2, count: 1 });
    });
  });

  describe("when shouldMergePhoneSystemFields=false (split mode)", () => {
    it("should split merged sources from attendeePhoneNumber into separate fields", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: false,
        bookingFields: [
          createAttendeePhoneField({
            hidden: false,
            sources: [
              createDefaultSource(),
              createWorkflowSource(1, { subType: "sms" }),
              createWorkflowSource(2, { subType: "calai" }),
            ],
          }),
        ],
        workflows: [
          createWorkflowWithSteps({ workflowId: 1, steps: [createSmsWorkflowStep()] }),
          createWorkflowWithSteps({ workflowId: 2, steps: [createCalAiWorkflowStep()] }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      // SMS and calAI sources should be split into their own fields
      expectSmsFieldExists({ fields: result });
      expectFieldExists({ fields: result, name: CAL_AI_AGENT_PHONE_NUMBER_FIELD });
    });

    it("should hide attendeePhoneNumber when no remaining workflow sources after split", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: false,
        bookingFields: [
          createAttendeePhoneField({
            hidden: false,
            sources: [
              createDefaultSource(),
              createWorkflowSource(1, { subType: "sms" }),
            ],
          }),
        ],
        workflows: [
          createWorkflowWithSteps({ workflowId: 1, steps: [createSmsWorkflowStep()] }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      // After splitting out the SMS source, attendeePhoneNumber has no workflow sources → hidden
      expectAttendeePhoneFieldHidden({ fields: result, hidden: true });
      expectSmsFieldExists({ fields: result });
    });
  });

  describe("when in legacy mode (shouldMergePhoneSystemFields=null/undefined)", () => {
    it("should not manipulate phone fields when shouldMergePhoneSystemFields is null", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: null,
        bookingFields: [
          createAttendeePhoneField({
            hidden: true,
            sources: [createDefaultSource()],
          }),
          createSmsReminderField({
            sources: [createDefaultSource(), createWorkflowSource(1)],
          }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      // Both fields should remain — no merge or split
      expectAttendeePhoneFieldExists({ fields: result });
      expectSmsFieldExists({ fields: result });
      // attendeePhoneNumber should NOT have inherited the SMS workflow source
      expectAttendeePhoneFieldSourcesHaveNoSubTypes({ fields: result });
    });

    it("should tag legacy SMS workflow sources with subType for consent footer display", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: null,
        bookingFields: [
          createAttendeePhoneField({
            hidden: true,
            sources: [createDefaultSource()],
          }),
          createSmsReminderField({
            sources: [createDefaultSource(), createWorkflowSource(1)],
          }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      // The workflow source on smsReminderNumber should be tagged with subType "sms"
      expectFieldHasWorkflowSource({ fields: result, name: SMS_REMINDER_NUMBER_FIELD, subType: "sms" });
    });

    it("should tag legacy calAI workflow sources with subType for consent footer display", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: null,
        bookingFields: [
          createAttendeePhoneField({
            hidden: true,
            sources: [createDefaultSource()],
          }),
          createCalAiField({
            sources: [createDefaultSource(), createWorkflowSource(3)],
          }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      // The workflow source on calAiAgentNumber should be tagged with subType "calai"
      expectFieldHasWorkflowSource({ fields: result, name: CAL_AI_AGENT_PHONE_NUMBER_FIELD, subType: "calai" });
    });

    it("should tag legacy workflow sources on both SMS and calAI fields simultaneously", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: null,
        bookingFields: [
          createAttendeePhoneField({
            hidden: true,
            sources: [createDefaultSource()],
          }),
          createSmsReminderField({
            sources: [createDefaultSource(), createWorkflowSource(1)],
          }),
          createCalAiField({
            sources: [createDefaultSource(), createWorkflowSource(2)],
          }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      expectFieldHasWorkflowSource({ fields: result, name: SMS_REMINDER_NUMBER_FIELD, subType: "sms" });
      expectFieldHasWorkflowSource({ fields: result, name: CAL_AI_AGENT_PHONE_NUMBER_FIELD, subType: "calai" });
      // attendeePhoneNumber should NOT have inherited any workflow sources
      expectAttendeePhoneFieldSourcesHaveNoSubTypes({ fields: result });
    });

    it("should not manipulate phone fields when shouldMergePhoneSystemFields is undefined", () => {
      const testArgs = createBaseTestArgs({
        shouldMergePhoneSystemFields: undefined,
        bookingFields: [
          createAttendeePhoneField({
            hidden: true,
            sources: [createDefaultSource()],
          }),
          createSmsReminderField({
            sources: [createDefaultSource(), createWorkflowSource(1)],
          }),
        ],
      });

      const result = ensureBookingInputsHaveSystemFields(testArgs);

      expectAttendeePhoneFieldExists({ fields: result });
      expectSmsFieldExists({ fields: result });
      expectAttendeePhoneFieldSourcesHaveNoSubTypes({ fields: result });
    });
  });
});

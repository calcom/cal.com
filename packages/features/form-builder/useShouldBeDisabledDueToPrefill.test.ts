import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useShouldBeDisabledDueToPrefill } from "./useShouldBeDisabledDueToPrefill";

vi.mock("@calcom/lib/hooks/useRouterQuery", () => ({
  useRouterQuery: vi.fn(),
}));

// Mock `react-hook-form` module
vi.mock("react-hook-form", async () => {
  const actual: any = await vi.importActual("react-hook-form");
  return {
    ...actual,
    useFormContext: vi.fn(),
  };
});

const defaultField = {
  name: "test-field",
  type: "text" as const,
};

type FormState = {
  dirtyFields: {
    responses: Record<string, boolean>;
  };
};

const buildFormState = (formState?: FormState) => {
  formState = formState || {
    dirtyFields: {
      responses: {},
    },
  };
  return {
    ...formState,
  };
};

const buildFormStateWithErrorForField = ({
  fieldName,
  formState,
}: {
  fieldName: string;
  formState?: FormState;
}) => {
  return {
    ...buildFormState(formState),
    errors: {
      responses: {
        message: `{${fieldName}}Some error in the field`,
      },
    },
  };
};

const buildFormStateWithNoErrors = (formState?: FormState) => {
  return buildFormState(formState);
};

const getMockFormContext = ({
  formState,
  responses,
}: {
  formState: FormState;
  responses: Record<string, string | string[]>;
}) => {
  return {
    formState,
    control: {} as Control,
    getValues: () => ({
      responses,
    }),
  };
};

function mockFormContext({ formState, responses }: { formState: any; responses: any }) {
  (vi.mocked(useFormContext) as any).mockReturnValue(getMockFormContext({ formState, responses }));
}

function mockScenario({
  formState,
  responses,
  searchParams,
}: {
  formState: any;
  responses: any;
  searchParams: any;
}) {
  mockFormContext({ formState, responses });
  vi.mocked(useRouterQuery).mockReturnValue(searchParams);
}

describe("useShouldBeDisabledDueToPrefill", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  describe("When disableOnPrefill is true", () => {
    test("should return `false` for a field if there is an error for the field", () => {
      const field = {
        ...defaultField,
        disableOnPrefill: true,
      };
      mockScenario({
        formState: buildFormStateWithErrorForField({ fieldName: field.name }),
        responses: {
          [field.name]: "TestValue",
        },
        searchParams: {
          [field.name]: "TestValue",
        },
      });
      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);

      expect(shouldBeDisabled).toBe(false);
    });

    test("should return `true` for a field if there is an error but not for that field", () => {
      const field = {
        ...defaultField,
        disableOnPrefill: true,
      };
      mockScenario({
        formState: buildFormStateWithErrorForField({ fieldName: "some-other-field" }),
        responses: {
          [field.name]: "TestValue",
        },
        searchParams: {
          [field.name]: "TestValue",
        },
      });
      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);

      expect(shouldBeDisabled).toBe(true);
    });

    test("should return `true` for a field if there are no errors", () => {
      const field = {
        ...defaultField,
        disableOnPrefill: true,
      };
      mockScenario({
        formState: buildFormStateWithNoErrors(),
        responses: {
          [field.name]: "TestValue",
        },
        searchParams: {
          [field.name]: "TestValue",
        },
      });
      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);

      expect(shouldBeDisabled).toBe(true);
    });

    test("should return `false` when the responses and searchParams both are empty(handles the undefined === undefined case)", () => {
      const field = {
        ...defaultField,
        disableOnPrefill: true,
      };
      mockScenario({
        formState: buildFormStateWithNoErrors(),
        responses: {},
        searchParams: {},
      });
      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);

      expect(shouldBeDisabled).toBe(false);
    });

    describe("Special handling of radioInput and variantsConfig type fields", () => {
      describe("radioInput type field", () => {
        test(`should return true for radioInput type field when the searchParams value is set and response is also set even though it doesn't match`, () => {
          const field = {
            ...defaultField,
            type: "radioInput" as const,
            disableOnPrefill: true,
            optionsInputs: {
              phone: {
                type: "phone" as const,
              },
            },
          };
          mockScenario({
            formState: buildFormStateWithNoErrors(),
            searchParams: {
              [field.name]: "TestValue1",
            },
            responses: {
              [field.name]: {
                value: "phone",
                optionValue: "TestValue2",
              },
            },
          });
          const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
          expect(shouldBeDisabled).toBe(true);
        });

        test(`should return false for radioInput type field when the searchParams value is set and response is also set but it isn't valid`, () => {
          const field = {
            ...defaultField,
            type: "radioInput" as const,
            disableOnPrefill: true,
            optionsInputs: {
              phone: {
                type: "phone" as const,
              },
            },
          };
          mockScenario({
            formState: buildFormStateWithNoErrors(),
            searchParams: {
              [field.name]: "TestValue1",
            },
            responses: {
              [field.name]: "TestValue2",
            },
          });
          const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
          expect(shouldBeDisabled).toBe(false);
        });

        test(`should return false for radioInput type field when the searchParams value is set and response is also set but it radioInput value isn't completely filled(optionsInputs case)`, () => {
          const field = {
            ...defaultField,
            type: "radioInput" as const,
            disableOnPrefill: true,
            optionsInputs: {
              phone: {
                type: "phone" as const,
              },
            },
          };
          mockScenario({
            formState: buildFormStateWithNoErrors(),
            searchParams: {
              [field.name]: "TestValue1",
            },
            responses: {
              [field.name]: {
                value: "phone",
                // Not filled
                optionValue: "",
              },
            },
          });
          const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
          expect(shouldBeDisabled).toBe(false);
        });

        test(`should return false for radioInput type field when the searchParams value is set and response is also set but it radioInput value isn't completely filled`, () => {
          const field = {
            ...defaultField,
            type: "radioInput" as const,
            disableOnPrefill: true,
            optionsInputs: {
              not_phone: {
                type: "phone" as const,
              },
            },
          };
          mockScenario({
            formState: buildFormStateWithNoErrors(),
            searchParams: {
              [field.name]: "TestValue1",
            },
            responses: {
              [field.name]: {
                value: "phone",
                // Not filled but doesn't matter because phone type doesn't need optionValue as per the optionsInputs
                optionValue: "",
              },
            },
          });
          const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
          expect(shouldBeDisabled).toBe(true);
        });

        test(`should return false for radioInput type field if some other field is set in the searchParams`, () => {
          const field = {
            ...defaultField,
            type: "radioInput" as const,
            disableOnPrefill: true,
          };
          mockScenario({
            formState: buildFormStateWithNoErrors(),
            searchParams: {
              ["some-other-field"]: "TestValue1",
            },
            responses: {},
          });
          const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
          expect(shouldBeDisabled).toBe(false);
        });
      });

      test(`should return true for field with variantsConfig when the searchParams value is set and response is also set even though it doesn't match`, () => {
        const field = {
          ...defaultField,
          type: "text" as const,
          variantsConfig: {
            variants: {
              TestValue1: {
                fields: [],
              },
            },
          },
          disableOnPrefill: true,
        };
        mockScenario({
          formState: buildFormStateWithNoErrors(),
          searchParams: {
            [field.name]: "TestValue1",
          },
          responses: {
            [field.name]: "TestValue2",
          },
        });
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(true);
      });
    });

    describe("for array type value", () => {
      test(`should return 'true' when there is complete match of values b/w the searchParams and the responses prefilled`, () => {
        const field = {
          ...defaultField,
          disableOnPrefill: true,
        };
        mockScenario({
          formState: buildFormStateWithNoErrors(),
          responses: {
            [field.name]: ["TestValue1", "TestValue2"],
          },
          searchParams: {
            [field.name]: ["TestValue1", "TestValue2"],
          },
        });
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(true);
      });

      test(`should return 'true' even when searchParams value partially exists in the responses`, () => {
        const field = {
          ...defaultField,
          disableOnPrefill: true,
        };
        mockScenario({
          formState: buildFormStateWithNoErrors(),
          responses: {
            [field.name]: ["TestValue1", "TestValue2"],
          },
          searchParams: {
            [field.name]: ["TestValue1"],
          },
        });
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(true);
      });

      test(`should return 'true' even when responses value partially exists in the searchParams`, () => {
        const field = {
          ...defaultField,
          disableOnPrefill: true,
        };
        mockScenario({
          formState: buildFormStateWithNoErrors(),
          responses: {
            [field.name]: ["TestValue1"],
          },
          searchParams: {
            [field.name]: ["TestValue1", "TestValue2"],
          },
        });
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(true);
      });

      test(`should return 'false' when there is a mismatch`, () => {
        const field = {
          ...defaultField,
          disableOnPrefill: true,
        };
        mockScenario({
          formState: buildFormStateWithNoErrors(),
          responses: {
            [field.name]: ["TestValue3"],
          },
          searchParams: {
            [field.name]: ["TestValue1", "TestValue2"],
          },
        });
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(false);
      });
    });

    describe("for number type value", () => {
      test(`should return 'true' when number type value is prefilled`, () => {
        const field = {
          ...defaultField,
          disableOnPrefill: true,
        };
        mockScenario({
          formState: buildFormStateWithNoErrors(),
          responses: {
            [field.name]: 123,
          },
          searchParams: {
            [field.name]: 123,
          },
        });
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(true);
      });

      test(`should return 'true' when when the searchParams value is a string and the responses value is a number`, () => {
        const field = {
          ...defaultField,
          disableOnPrefill: true,
        };
        mockScenario({
          formState: buildFormStateWithNoErrors(),
          responses: {
            [field.name]: "123",
          },
          searchParams: {
            [field.name]: 123,
          },
        });
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(true);
      });

      test(`should return 'true' when when the searchParams value is a number and the responses value is a string`, () => {
        const field = {
          ...defaultField,
          disableOnPrefill: true,
        };
        mockScenario({
          formState: buildFormStateWithNoErrors(),
          responses: {
            [field.name]: 123,
          },
          searchParams: {
            [field.name]: "123",
          },
        });
        const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
        expect(shouldBeDisabled).toBe(true);
      });
    });

    test("should return `false` for a field even if there are no errors and it is prefilled but the field is dirty", () => {
      const field = {
        ...defaultField,
        disableOnPrefill: true,
      };
      mockScenario({
        formState: buildFormStateWithNoErrors({
          dirtyFields: {
            responses: {
              [field.name]: true,
            },
          },
        }),
        responses: {
          [field.name]: "TestValue",
        },
        searchParams: {
          [field.name]: "TestValue",
        },
      });
      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);

      expect(shouldBeDisabled).toBe(false);
    });
  });

  describe("When disableOnPrefill is false", () => {
    test(`should return 'false' for the field`, () => {
      const field = {
        ...defaultField,
        disableOnPrefill: false,
      };

      mockScenario({
        formState: buildFormStateWithNoErrors(),
        responses: {},
        searchParams: {},
      });

      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
      expect(shouldBeDisabled).toBe(false);
    });

    test(`should return 'false' for the field even when the field is prefilled`, () => {
      const field = {
        ...defaultField,
        disableOnPrefill: false,
      };

      mockScenario({
        formState: buildFormStateWithNoErrors(),
        responses: {
          [field.name]: "TestValue",
        },
        searchParams: {
          [field.name]: "TestValue",
        },
      });

      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
      expect(shouldBeDisabled).toBe(false);
    });

    test(`should return 'false' for field having variantsConfig even when the field is prefilled`, () => {
      const field = {
        ...defaultField,
        variantsConfig: {
          variants: {
            TestValue1: {
              fields: [],
            },
            TestValue2: {
              fields: [],
            },
          },
        },
        disableOnPrefill: false,
      };

      mockScenario({
        formState: buildFormStateWithNoErrors(),
        responses: {
          [field.name]: "TestValue1",
        },
        searchParams: {
          [field.name]: "TestValue",
        },
      });

      const shouldBeDisabled = useShouldBeDisabledDueToPrefill(field);
      expect(shouldBeDisabled).toBe(false);
    });
  });
});

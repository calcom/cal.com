import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import { describe, expect, vi, beforeEach, test } from "vitest";

import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";

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
};

const buildFormState = () => {
  return {};
};

const buildFormStateWithErrorForField = (fieldName: string) => {
  return {
    ...buildFormState(),
    errors: {
      responses: {
        message: `{${fieldName}}Some error in the field`,
      },
    },
  };
};

const buildFormStateWithNoErrors = () => {
  return buildFormState();
};

const getMockFormContext = ({
  formState,
  responses,
}: {
  formState: any;
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
        formState: buildFormStateWithErrorForField(field.name),
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
        formState: buildFormStateWithErrorForField("some-other-field"),
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
  });
});

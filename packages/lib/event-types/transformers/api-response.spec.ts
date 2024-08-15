import { describe, expect, it } from "vitest";

import type {
  AddressLocation_2024_06_14,
  LinkLocation_2024_06_14,
  PhoneLocation_2024_06_14,
  IntegrationLocation_2024_06_14,
  TransformBookingLimitsSchema_2024_06_14,
  TransformFutureBookingsLimitSchema_2024_06_14,
} from "@calcom/platform-types";

import type { UserField } from "./api-request";
import {
  getResponseEventTypeLocations,
  getResponseEventTypeBookingFields,
  getResponseEventTypeIntervalLimits,
  getResponseEventTypeFutureBookingLimits,
} from "./api-response";

describe("getResponseEventTypeLocations", () => {
  it("should reverse transform address location", () => {
    const transformedLocation = [
      {
        type: "inPerson",
        address: "1234 Main St",
        displayLocationPublicly: true,
      },
    ];

    const expectedOutput: AddressLocation_2024_06_14[] = [
      {
        type: "address",
        address: "1234 Main St",
        public: true,
      },
    ];

    const result = getResponseEventTypeLocations(transformedLocation);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform link location", () => {
    const transformedLocation = [
      {
        type: "link",
        link: "https://example.com",
        displayLocationPublicly: true,
      },
    ];

    const expectedOutput: LinkLocation_2024_06_14[] = [
      {
        type: "link",
        link: "https://example.com",
        public: true,
      },
    ];

    const result = getResponseEventTypeLocations(transformedLocation);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform phone location", () => {
    const transformedLocation = [
      {
        type: "userPhone",
        hostPhoneNumber: "123456789",
        displayLocationPublicly: true,
      },
    ];

    const expectedOutput: PhoneLocation_2024_06_14[] = [
      {
        type: "phone",
        phone: "123456789",
        public: true,
      },
    ];

    const result = getResponseEventTypeLocations(transformedLocation);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform integration location", () => {
    const transformedLocation = [
      {
        type: "integrations:daily",
      },
    ];

    const expectedOutput: IntegrationLocation_2024_06_14[] = [
      {
        type: "integration",
        integration: "cal-video",
      },
    ];

    const result = getResponseEventTypeLocations(transformedLocation);

    expect(result).toEqual(expectedOutput);
  });
});

describe("getResponseEventTypeBookingFields", () => {
  it("should reverse transform name field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-name",
        type: "name",
        label: "Your name",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "alice",
      },
    ];

    const expectedOutput = [
      {
        type: "name",
        slug: "your-name",
        label: "Your name",
        required: true,
        placeholder: "alice",
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform email field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-email",
        type: "email",
        label: "Your email",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "example@example.com",
      },
    ];

    const expectedOutput = [
      {
        type: "email",
        slug: "your-email",
        label: "Your email",
        required: true,
        placeholder: "example@example.com",
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform phone field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-phone",
        type: "phone",
        label: "Your phone number",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "123456789",
      },
    ];

    const expectedOutput = [
      {
        type: "phone",
        slug: "your-phone",
        label: "Your phone number",
        required: true,
        placeholder: "123456789",
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform address field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-address",
        type: "address",
        label: "Your address",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "1234 Main St",
      },
    ];

    const expectedOutput = [
      {
        type: "address",
        slug: "your-address",
        label: "Your address",
        required: true,
        placeholder: "1234 Main St",
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform text field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-text",
        type: "text",
        label: "Your text",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "Enter your text",
      },
    ];

    const expectedOutput = [
      {
        type: "text",
        slug: "your-text",
        label: "Your text",
        required: true,
        placeholder: "Enter your text",
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform number field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-number",
        type: "number",
        label: "Your number",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "100",
      },
    ];

    const expectedOutput = [
      {
        type: "number",
        slug: "your-number",
        label: "Your number",
        required: true,
        placeholder: "100",
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform textarea field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-textarea",
        type: "textarea",
        label: "Your detailed information",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "Detailed description here...",
      },
    ];

    const expectedOutput = [
      {
        type: "textarea",
        slug: "your-textarea",
        label: "Your detailed information",
        required: true,
        placeholder: "Detailed description here...",
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform select field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-select",
        type: "select",
        label: "Your selection",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "Select...",
        options: [
          { label: "Option 1", value: "Option 1" },
          { label: "Option 2", value: "Option 2" },
        ],
      },
    ];

    const expectedOutput = [
      {
        type: "select",
        slug: "your-select",
        label: "Your selection",
        required: true,
        placeholder: "Select...",
        options: ["Option 1", "Option 2"],
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform multiselect field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-multiselect",
        type: "multiselect",
        label: "Your multiple selections",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        options: [
          { label: "Option 1", value: "Option 1" },
          { label: "Option 2", value: "Option 2" },
        ],
      },
    ];

    const expectedOutput = [
      {
        type: "multiselect",
        slug: "your-multiselect",
        label: "Your multiple selections",
        required: true,
        options: ["Option 1", "Option 2"],
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform multiemail field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-multiemail",
        type: "multiemail",
        label: "Your multiple emails",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "example@example.com",
      },
    ];

    const expectedOutput = [
      {
        type: "multiemail",
        slug: "your-multiemail",
        label: "Your multiple emails",
        required: true,
        placeholder: "example@example.com",
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform checkbox field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-checkbox",
        type: "checkbox",
        label: "Your checkboxes",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        options: [
          { label: "Checkbox 1", value: "Checkbox 1" },
          { label: "Checkbox 2", value: "Checkbox 2" },
        ],
      },
    ];

    const expectedOutput = [
      {
        type: "checkbox",
        slug: "your-checkbox",
        label: "Your checkboxes",
        required: true,
        options: ["Checkbox 1", "Checkbox 2"],
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform radio field", () => {
    const transformedField: UserField[] = [
      {
        name: "your-radio",
        type: "radio",
        label: "Your radio buttons",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        options: [
          { label: "Radio 1", value: "Radio 1" },
          { label: "Radio 2", value: "Radio 2" },
        ],
      },
    ];

    const expectedOutput = [
      {
        type: "radio",
        slug: "your-radio",
        label: "Your radio buttons",
        required: true,
        options: ["Radio 1", "Radio 2"],
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });

  it("should reverse transform boolean field", () => {
    const transformedField: UserField[] = [
      {
        name: "agree-to-terms",
        type: "boolean",
        label: "Agree to terms?",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "",
      },
    ];

    const expectedOutput = [
      {
        type: "boolean",
        slug: "agree-to-terms",
        label: "Agree to terms?",
        required: true,
      },
    ];

    const result = getResponseEventTypeBookingFields(transformedField);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformApiEventTypeIntervalLimits", () => {
  it("should reverse transform booking limits count or booking limits duration", () => {
    const transformedField: TransformBookingLimitsSchema_2024_06_14 = {
      PER_DAY: 2,
      PER_WEEK: 11,
      PER_MONTH: 22,
      PER_YEAR: 33,
    };

    const expectedOutput = {
      day: 2,
      week: 11,
      month: 22,
      year: 33,
    };
    const result = getResponseEventTypeIntervalLimits(transformedField);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformApiEventTypeFutureBookingLimits", () => {
  it("should reverse transform range type", () => {
    const transformedField: TransformFutureBookingsLimitSchema_2024_06_14 = {
      periodType: "RANGE",
      periodStartDate: new Date("2024-08-06T09:14:30.000Z"),
      periodEndDate: new Date("2024-08-28T18:30:00.000Z"),
    };
    const expectedOutput = {
      type: "range",
      value: ["2024-08-06", "2024-08-28"],
    };

    const result = getResponseEventTypeFutureBookingLimits(transformedField);

    expect(result).toEqual(expectedOutput);
  });
  it("should reverse transform calendar days", () => {
    const transformedField: TransformFutureBookingsLimitSchema_2024_06_14 = {
      periodType: "ROLLING",
      periodDays: 30,
      periodCountCalendarDays: true,
    };
    const expectedOutput = {
      type: "calendarDays",
      value: 30,
      rolling: false,
    };

    const result = getResponseEventTypeFutureBookingLimits(transformedField);

    expect(result).toEqual(expectedOutput);
  });
  it("should reverse transform calendar days rolling-window", () => {
    const transformedField: TransformFutureBookingsLimitSchema_2024_06_14 = {
      periodType: "ROLLING_WINDOW",
      periodDays: 30,
      periodCountCalendarDays: true,
    };

    const expectedOutput = {
      type: "calendarDays",
      value: 30,
      rolling: true,
    };

    const result = getResponseEventTypeFutureBookingLimits(transformedField);

    expect(result).toEqual(expectedOutput);
  });
  it("should reverse transform Business days", () => {
    const transformedField: TransformFutureBookingsLimitSchema_2024_06_14 = {
      periodType: "ROLLING",
      periodDays: 30,
      periodCountCalendarDays: false,
    };

    const expectedOutput = {
      type: "businessDays",
      value: 30,
      rolling: false,
    };

    const result = getResponseEventTypeFutureBookingLimits(transformedField);

    expect(result).toEqual(expectedOutput);
  });
  it("should reverse transform Business days rolling-window", () => {
    const transformedField: TransformFutureBookingsLimitSchema_2024_06_14 = {
      periodType: "ROLLING_WINDOW",
      periodDays: 30,
      periodCountCalendarDays: false,
    };

    const expectedOutput = {
      type: "businessDays",
      value: 30,
      rolling: true,
    };

    const result = getResponseEventTypeFutureBookingLimits(transformedField);

    expect(result).toEqual(expectedOutput);
  });
});

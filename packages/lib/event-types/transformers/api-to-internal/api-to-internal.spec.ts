import { describe, expect, it } from "vitest";

import { FrequencyInput } from "@calcom/platform-enums/monorepo";
import type {
  InputBookingField_2024_06_14,
  Location_2024_06_14,
  BookingLimitsCount_2024_06_14,
  BookingWindow_2024_06_14,
  Recurrence_2024_06_14,
} from "@calcom/platform-types";

import type { CustomField } from "../internal-to-api/booking-fields";
import {
  transformLocationsApiToInternal,
  transformBookingFieldsApiToInternal,
  transformSelectOptionsApiToInternal,
  transformIntervalLimitsApiToInternal,
  transformFutureBookingLimitsApiToInternal,
  transformRecurrenceApiToInternal,
} from "./index";

describe("transformLocationsApiToInternal", () => {
  it("should transform address", () => {
    const input: Location_2024_06_14[] = [
      {
        type: "address",
        address: "London road 10-1",
        public: true,
      },
    ];

    const expectedOutput = [{ type: "inPerson", address: "London road 10-1", displayLocationPublicly: true }];

    const result = transformLocationsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform link", () => {
    const input: Location_2024_06_14[] = [
      {
        type: "link",
        link: "https://customvideo.com/join/123456",
        public: true,
      },
    ];

    const expectedOutput = [
      { type: "link", link: "https://customvideo.com/join/123456", displayLocationPublicly: true },
    ];

    const result = transformLocationsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform integration", () => {
    const input: Location_2024_06_14[] = [
      {
        type: "integration",
        integration: "cal-video",
      },
    ];

    const expectedOutput = [{ type: "integrations:daily" }];

    const result = transformLocationsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform phone", () => {
    const input: Location_2024_06_14[] = [
      {
        type: "phone",
        phone: "+37120993151",
        public: true,
      },
    ];

    const expectedOutput = [
      { type: "userPhone", hostPhoneNumber: "+37120993151", displayLocationPublicly: true },
    ];

    const result = transformLocationsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformBookingFieldsApiToInternal", () => {
  it("should transform phone field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "phone",
      slug: "phone",
      label: "Your phone number",
      required: true,
      placeholder: "123456789",
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: bookingField.placeholder,
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform address field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "address",
      slug: "address",
      label: "Your address",
      required: true,
      placeholder: "1234 Main St",
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: bookingField.placeholder,
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform text field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "text",
      slug: "text",
      label: "Your text",
      required: true,
      placeholder: "Enter your text",
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: bookingField.placeholder,
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform number field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "number",
      slug: "number",
      label: "Your number",
      required: true,
      placeholder: "100",
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: bookingField.placeholder,
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform textarea field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "textarea",
      slug: "textarea",
      label: "Your detailed information",
      required: true,
      placeholder: "Detailed description here...",
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: bookingField.placeholder,
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform select field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "select",
      slug: "select",
      label: "Your selection",
      required: true,
      placeholder: "Select...",
      options: ["Option 1", "Option 2"],
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: bookingField.placeholder,
        options: transformSelectOptionsApiToInternal(bookingField.options),
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform multiselect field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "multiselect",
      slug: "multiselect",
      label: "Your multiple selections",
      required: true,
      options: ["Option 1", "Option 2"],
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: "",
        options: transformSelectOptionsApiToInternal(bookingField.options),
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform multiemail field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "multiemail",
      slug: "multiemail",
      label: "Your multiple emails",
      required: true,
      placeholder: "example@example.com",
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: bookingField.placeholder,
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform checkbox field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "checkbox",
      slug: "checkbox",
      label: "Your checkboxes",
      required: true,
      options: ["Checkbox 1", "Checkbox 2"],
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: "",
        options: transformSelectOptionsApiToInternal(bookingField.options),
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform radio field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "radio",
      slug: "radio",
      label: "Your radio buttons",
      required: true,
      options: ["Radio 1", "Radio 2"],
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: "",
        options: transformSelectOptionsApiToInternal(bookingField.options),
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform boolean field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "boolean",
      slug: "boolean",
      label: "Agree to terms?",
      required: true,
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: CustomField[] = [
      {
        name: bookingField.slug,
        type: bookingField.type,
        label: bookingField.label,
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: bookingField.required,
        placeholder: "",
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformIntervalLimitsApiToInternal", () => {
  it("should transform booking limits count or booking limits duration", () => {
    const input: BookingLimitsCount_2024_06_14 = {
      day: 2,
      week: 11,
      month: 22,
      year: 33,
    };

    const expectedOutput = {
      PER_DAY: 2,
      PER_WEEK: 11,
      PER_MONTH: 22,
      PER_YEAR: 33,
    };
    const result = transformIntervalLimitsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformFutureBookingLimitsApiToInternal", () => {
  it("should transform range type", () => {
    const input: BookingWindow_2024_06_14 = {
      type: "range",
      value: ["2024-08-06", "2024-08-28"],
    };

    const expectedOutput = {
      periodType: "RANGE",
      periodStartDate: new Date("2024-08-06"),
      periodEndDate: new Date("2024-08-28"),
    };

    const result = transformFutureBookingLimitsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
  it("should transform calendar days", () => {
    const input: BookingWindow_2024_06_14 = {
      type: "calendarDays",
      value: 30,
      rolling: false,
    };

    const expectedOutput = {
      periodType: "ROLLING",
      periodDays: 30,
      periodCountCalendarDays: true,
    };

    const result = transformFutureBookingLimitsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
  it("should transform calendar days rolling-window", () => {
    const input: BookingWindow_2024_06_14 = {
      type: "calendarDays",
      value: 30,
      rolling: true,
    };

    const expectedOutput = {
      periodType: "ROLLING_WINDOW",
      periodDays: 30,
      periodCountCalendarDays: true,
    };

    const result = transformFutureBookingLimitsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
  it("should transform Business days", () => {
    const input: BookingWindow_2024_06_14 = {
      type: "businessDays",
      value: 30,
      rolling: false,
    };

    const expectedOutput = {
      periodType: "ROLLING",
      periodDays: 30,
      periodCountCalendarDays: false,
    };

    const result = transformFutureBookingLimitsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
  it("should transform Business days rolling-window", () => {
    const input: BookingWindow_2024_06_14 = {
      type: "businessDays",
      value: 30,
      rolling: true,
    };

    const expectedOutput = {
      periodType: "ROLLING_WINDOW",
      periodDays: 30,
      periodCountCalendarDays: false,
    };

    const result = transformFutureBookingLimitsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformRecurrenceApiToInternal", () => {
  it("should transform recurrence", () => {
    const input: Recurrence_2024_06_14 = {
      frequency: FrequencyInput.weekly,
      interval: 2,
      occurrences: 10,
    };
    const expectedOutput = {
      interval: 2,
      count: 10,
      freq: 2,
    };
    const result = transformRecurrenceApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
});

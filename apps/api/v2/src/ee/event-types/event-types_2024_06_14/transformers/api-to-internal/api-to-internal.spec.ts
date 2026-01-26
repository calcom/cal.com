import {
  BookerLayoutsInputEnum_2024_06_14,
  BookerLayoutsOutputEnum_2024_06_14,
  ConfirmationPolicyEnum,
  FrequencyInput,
  NoticeThresholdUnitEnum,
} from "@calcom/platform-enums";
import type {
  BookerLayouts_2024_06_14,
  BookingLimitsCount_2024_06_14,
  BookingWindow_2024_06_14,
  ConfirmationPolicy_2024_06_14,
  CreateEventTypeInput_2024_06_14,
  EventTypeColor_2024_06_14,
  InputAttendeeAddressLocation_2024_06_14,
  InputAttendeeDefinedLocation_2024_06_14,
  InputAttendeePhoneLocation_2024_06_14,
  InputBookingField_2024_06_14,
  InputLocation_2024_06_14,
  InputTeamLocation_2024_06_14,
  Recurrence_2024_06_14,
  SeatOptionsDisabledSchema,
  SeatOptionsTransformedSchema,
} from "@calcom/platform-types";

import {
  type CustomField,
  type SystemField,
  systemBeforeFieldEmail,
  systemBeforeFieldName,
} from "../internal-to-api/booking-fields";
import {
  transformBookerLayoutsApiToInternal,
  transformBookingFieldsApiToInternal,
  transformConfirmationPolicyApiToInternal,
  transformEventColorsApiToInternal,
  transformFutureBookingLimitsApiToInternal,
  transformIntervalLimitsApiToInternal,
  transformLocationsApiToInternal,
  transformRecurrenceApiToInternal,
  transformSeatsApiToInternal,
  transformSelectOptionsApiToInternal,
  transformTeamLocationsApiToInternal,
} from "./index";

describe("transformLocationsApiToInternal", () => {
  it("should transform address", () => {
    const input: InputLocation_2024_06_14[] = [
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
    const input: InputLocation_2024_06_14[] = [
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
    const input: InputLocation_2024_06_14[] = [
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
    const input: InputLocation_2024_06_14[] = [
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

  it("should transform OrganizersDefaultApp", () => {
    const input: InputTeamLocation_2024_06_14[] = [
      {
        type: "organizersDefaultApp",
      },
    ];

    const expectedOutput = [{ type: "conferencing" }];

    const result = transformTeamLocationsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform attendee address", () => {
    const input: InputAttendeeAddressLocation_2024_06_14[] = [
      {
        type: "attendeeAddress",
      },
    ];

    const expectedOutput = [{ type: "attendeeInPerson" }];

    const result = transformLocationsApiToInternal(input);
    expect(result).toEqual(expectedOutput);
  });

  it("should transform attendee phone", () => {
    const input: InputAttendeePhoneLocation_2024_06_14[] = [
      {
        type: "attendeePhone",
      },
    ];

    const expectedOutput = [{ type: "phone" }];

    const result = transformLocationsApiToInternal(input);
    expect(result).toEqual(expectedOutput);
  });

  it("should transform attendee defined", () => {
    const input: InputAttendeeDefinedLocation_2024_06_14[] = [
      {
        type: "attendeeDefined",
      },
    ];

    const expectedOutput = [{ type: "somewhereElse" }];

    const result = transformLocationsApiToInternal(input);
    expect(result).toEqual(expectedOutput);
  });
});

describe("transformBookingFieldsApiToInternal", () => {
  it("should transform name field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "name",
      label: "Your name number",
      placeholder: "123456789",
      disableOnPrefill: true,
    };
    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedField = {
      ...systemBeforeFieldName,
      label: "Your name number",
      placeholder: "123456789",
      disableOnPrefill: true,
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    expectedField.variantsConfig.variants.fullName.fields[0].label = "Your name number";
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    expectedField.variantsConfig.variants.fullName.fields[0].placeholder = "123456789";

    const expectedOutput: SystemField[] = [expectedField];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform email field", () => {
    const bookingField: InputBookingField_2024_06_14 = {
      type: "email",
      label: "Your email",
      placeholder: "bob@gmail.com",
      disableOnPrefill: true,
      required: true,
    };

    const input: InputBookingField_2024_06_14[] = [bookingField];

    const expectedOutput: SystemField[] = [
      {
        ...systemBeforeFieldEmail,
        label: "Your email",
        placeholder: "bob@gmail.com",
        disableOnPrefill: true,
        hidden: false,
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

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
        disableOnPrefill: false,
        hidden: false,
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
        disableOnPrefill: false,
        hidden: false,
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
        disableOnPrefill: false,
        hidden: false,
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
        disableOnPrefill: false,
        hidden: false,
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
        disableOnPrefill: false,
        hidden: false,
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
        disableOnPrefill: false,
        hidden: false,
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
        options: transformSelectOptionsApiToInternal(bookingField.options),
        disableOnPrefill: false,
        hidden: false,
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
        disableOnPrefill: false,
        hidden: false,
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
        options: transformSelectOptionsApiToInternal(bookingField.options),
        disableOnPrefill: false,
        hidden: false,
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
        options: transformSelectOptionsApiToInternal(bookingField.options),
        disableOnPrefill: false,
        hidden: false,
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
        labelAsSafeHtml: `<p>${bookingField.label}</p>\n`,
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
        disableOnPrefill: false,
        hidden: false,
      },
    ];

    const result = transformBookingFieldsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should keep disableOnPrefill property", () => {
    const disableOnPrefill = true;

    const bookingField: InputBookingField_2024_06_14 = {
      type: "radio",
      slug: "radio",
      label: "Your radio buttons",
      required: true,
      options: ["Radio 1", "Radio 2"],
      disableOnPrefill,
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
        options: transformSelectOptionsApiToInternal(bookingField.options),
        disableOnPrefill,
        hidden: false,
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
  it("should normalize range type with full ISO strings to UTC midnight (positive offset)", () => {
    // Client in Dubai (UTC+4) sends full ISO strings - without normalization this would shift dates
    // e.g., "2024-08-06T00:00:00.000+04:00" would become 2024-08-05T20:00:00.000Z
    const input: BookingWindow_2024_06_14 = {
      type: "range",
      value: ["2024-08-06T00:00:00.000+04:00", "2024-08-28T00:00:00.000+04:00"],
    };

    // Should extract date part and create UTC midnight dates
    const expectedOutput = {
      periodType: "RANGE",
      periodStartDate: new Date("2024-08-06"),
      periodEndDate: new Date("2024-08-28"),
    };

    const result = transformFutureBookingLimitsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
  it("should normalize range type with full ISO strings to UTC midnight (negative offset)", () => {
    // Client in Buenos Aires (UTC-3) sends full ISO strings - without normalization this would shift dates
    // e.g., "2024-08-06T00:00:00.000-03:00" would become 2024-08-06T03:00:00.000Z (3 hours later)
    const input: BookingWindow_2024_06_14 = {
      type: "range",
      value: ["2024-08-06T00:00:00.000-03:00", "2024-08-28T00:00:00.000-03:00"],
    };

    // Should extract date part and create UTC midnight dates
    const expectedOutput = {
      periodType: "RANGE",
      periodStartDate: new Date("2024-08-06"),
      periodEndDate: new Date("2024-08-28"),
    };

    const result = transformFutureBookingLimitsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
  it("should normalize range type with full ISO strings to UTC midnight (UTC/Z suffix)", () => {
    // Client sends UTC timestamps with Z suffix
    const input: BookingWindow_2024_06_14 = {
      type: "range",
      value: ["2024-08-06T00:00:00.000Z", "2024-08-28T00:00:00.000Z"],
    };

    // Should extract date part and create UTC midnight dates
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

  it("should transform disabled", () => {
    const input: BookingWindow_2024_06_14 = {
      disabled: true,
    };

    const expectedOutput = {
      periodType: "UNLIMITED",
    };

    const result = transformFutureBookingLimitsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformBookerLayoutsApiToInternal", () => {
  it("should transform booker layouts", () => {
    const input: BookerLayouts_2024_06_14 = {
      enabledLayouts: [
        BookerLayoutsInputEnum_2024_06_14.column,
        BookerLayoutsInputEnum_2024_06_14.month,
        BookerLayoutsInputEnum_2024_06_14.week,
      ],
      defaultLayout: BookerLayoutsInputEnum_2024_06_14.week,
    };

    const expectedOutput = {
      enabledLayouts: [
        BookerLayoutsOutputEnum_2024_06_14.column_view,
        BookerLayoutsOutputEnum_2024_06_14.month_view,
        BookerLayoutsOutputEnum_2024_06_14.week_view,
      ],
      defaultLayout: BookerLayoutsOutputEnum_2024_06_14.week_view,
    };
    const result = transformBookerLayoutsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformConfirmationPolicyApiToInternal", () => {
  it("should transform requires confirmation - time", () => {
    const input: ConfirmationPolicy_2024_06_14 = {
      type: ConfirmationPolicyEnum.TIME,
      noticeThreshold: {
        count: 60,
        unit: NoticeThresholdUnitEnum.MINUTES,
      },
      blockUnconfirmedBookingsInBooker: true,
    };

    const expectedOutput = {
      requiresConfirmation: true,
      requiresConfirmationThreshold: {
        time: 60,
        unit: NoticeThresholdUnitEnum.MINUTES,
      },
      requiresConfirmationWillBlockSlot: true,
    };
    const result = transformConfirmationPolicyApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform requires confirmation - always", () => {
    const input: ConfirmationPolicy_2024_06_14 = {
      type: ConfirmationPolicyEnum.ALWAYS,
      blockUnconfirmedBookingsInBooker: true,
    };

    const expectedOutput = {
      requiresConfirmation: true,
      requiresConfirmationWillBlockSlot: true,
    };
    const result = transformConfirmationPolicyApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform requires confirmation - disabled", () => {
    const input: ConfirmationPolicy_2024_06_14 = {
      disabled: true,
    };

    const expectedOutput = {
      requiresConfirmation: false,
      requiresConfirmationWillBlockSlot: false,
      requiresConfirmationThreshold: undefined,
    };
    const result = transformConfirmationPolicyApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformEventColorsApiToInternal", () => {
  it("should transform event type colors", () => {
    const input: EventTypeColor_2024_06_14 = {
      darkThemeHex: "#292929",
      lightThemeHex: "#fafafa",
    };

    const expectedOutput = {
      darkEventTypeColor: "#292929",
      lightEventTypeColor: "#fafafa",
    };

    const result = transformEventColorsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });
});

describe("transformSeatsApiToInternal", () => {
  it("should transform seat options", () => {
    const input: CreateEventTypeInput_2024_06_14["seats"] = {
      seatsPerTimeSlot: 20,
      showAttendeeInfo: true,
      showAvailabilityCount: false,
    };

    const expectedOutput: SeatOptionsTransformedSchema = {
      seatsPerTimeSlot: 20,
      seatsShowAttendees: true,
      seatsShowAvailabilityCount: false,
    };

    const result = transformSeatsApiToInternal(input);

    expect(result).toEqual(expectedOutput);
  });

  it("should transform seat options - disabled", () => {
    const input: CreateEventTypeInput_2024_06_14["seats"] = {
      disabled: true,
    };

    const expectedOutput: SeatOptionsDisabledSchema = {
      seatsPerTimeSlot: null,
    };

    const result = transformSeatsApiToInternal(input);

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

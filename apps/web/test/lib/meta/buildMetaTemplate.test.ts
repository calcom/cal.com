import prisma from "../../../../../tests/libs/__mocks__/prismaMock";

import {
  buildMetaTemplateComponentsFromTemplate,
  type WhatsAppTemplate,
} from "@calid/features/modules/workflows/providers/meta";
import type { VariablesType } from "@calid/lib/variables";
import { describe, it, expect, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";

// ==================== MOCK VARIABLE DATA ====================

const mockTime = dayjs("2025-12-17T14:30:00").tz("America/New_York", true);


export const mockVariableData: VariablesType = {
  eventName: "Team Meeting",
  organizerName: "John Organizer",
  attendeeName: "John",
  attendeeFirstName: "John",
  attendeeLastName: "Doe",
  attendeeEmail: "john@example.com",
  eventDate: undefined, // Dayjs object would be used in real scenario
  eventEndTime: undefined,
  timezone: "America/New_York",
  location: "Conference Room A",
  additionalNotes: "Please bring your laptop",
  responses: null,
  meetingUrl: "https://meet.example.com/abc123",
  cancelUrl: "https://example.com/cancel/xyz",
  rescheduleUrl: "https://example.com/reschedule/xyz",
  ratingUrl: "https://example.com/rate/xyz",
  noShowUrl: "https://example.com/noshow/xyz",
  attendeeTimezone: "America/Los_Angeles",
  eventStartTimeInAttendeeTimezone: mockTime,
  eventEndTimeInAttendeeTimezone: undefined,
};

// Mock credentials for async function calls
const MOCK_PHONE_NUMBER_ID = "test-phone-123";
const MOCK_ACCESS_TOKEN = "test-token-456";

// ==================== MOCK TEMPLATES ====================

export const mockBodyOnly: WhatsAppTemplate = {
  id: "1001",
  name: "body_only",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      text: "Hello world",
      type: "BODY",
    },
  ],
  sub_category: "CUSTOM",
  parameter_format: "POSITIONAL",
};

export const demoCallReminderTemplate: WhatsAppTemplate = {
  id: "1549651672903278",
  name: "demo_call_reminder",
  status: "APPROVED",
  category: "UTILITY",
  language: "en",
  components: [
    {
      text: "Hi {{attendee_first_name}},\nGentle reminder!\n\nYou have a call schedule with us at {{event_time}} {{timezone}}\nMeeting Link:  {{meeting_url}}.\nPlease join the call. \n\nBest,\nCal ID Team",
      type: "BODY",
      example: {
        body_text_named_params: [
          {
            example: "Manas",
            param_name: "attendee_first_name",
          },
          {
            example: "10:00 PM",
            param_name: "event_time",
          },
          {
            example: "IST",
            param_name: "timezone",
          },
          {
            example: "https://meet.google.com/muk-kyyd-fzn",
            param_name: "meeting_url",
          },
        ],
      },
    },
  ],
  sub_category: "FORM",
  parameter_format: "NAMED",
};

export const mockBodyWithPositionalParams: WhatsAppTemplate = {
  id: "1002",
  name: "body_with_params",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      text: "Hello {{attendee_name}}, your order {{event_name}} is ready for pickup at {{location}}.",
      type: "BODY",
    },
  ],
  sub_category: "CUSTOM",
  parameter_format: "POSITIONAL",
};

export const mockBodyWithNamedParams: WhatsAppTemplate = {
  id: "1003",
  name: "body_named_params",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      text: "Hello {{attendee_name}}, your appointment is on {{event_name}} at {{timezone}}.",
      type: "BODY",
    },
  ],
  parameter_format: "NAMED",
};

export const mockHeaderTextPositional: WhatsAppTemplate = {
  id: "1004",
  name: "header_text_positional",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "TEXT",
      text: "Welcome {{attendee_name}}!",
    },
    {
      text: "Thanks for joining us.",
      type: "BODY",
    },
  ],
  parameter_format: "POSITIONAL",
};

export const mockHeaderTextNamed: WhatsAppTemplate = {
  id: "1005",
  name: "header_text_named",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "TEXT",
      text: "Invoice for {{organizer_name}}",
    },
    {
      text: "Your invoice is ready.",
      type: "BODY",
    },
  ],
  parameter_format: "NAMED",
};

export const mockButtonsStatic: WhatsAppTemplate = {
  id: "1009",
  name: "buttons_static",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      text: "Would you like to continue?",
      type: "BODY",
    },
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "QUICK_REPLY",
          text: "Yes",
        },
        {
          type: "QUICK_REPLY",
          text: "No",
        },
      ],
    },
  ],
  parameter_format: "POSITIONAL",
};

export const mockButtonsDynamic: WhatsAppTemplate = {
  id: "1010",
  name: "buttons_dynamic",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      text: "Click the button below to view your order.",
      type: "BODY",
    },
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "URL",
          text: "View Order",
          url: "https://example.com/orders/{{meeting_url}}",
        },
      ],
    },
  ],
  parameter_format: "POSITIONAL",
};

export const mockButtonsMultipleDynamic: WhatsAppTemplate = {
  id: "1011",
  name: "buttons_multiple_dynamic",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      text: "Manage your account",
      type: "BODY",
    },
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "URL",
          text: "View Profile",
          url: "https://example.com/profile/{{cancel_url}}",
        },
        {
          type: "URL",
          text: "View Orders",
          url: "https://example.com/orders/{{reschedule_url}}",
        },
        {
          type: "PHONE_NUMBER",
          text: "Call Support",
          phone_number: "+1234567890",
        },
      ],
    },
  ],
  parameter_format: "POSITIONAL",
};

export const mockComplexTemplate: WhatsAppTemplate = {
  id: "1012",
  name: "complex_template",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      text: "Hi {{attendee_name}}, your order {{event_name}} is confirmed for {{location}}.",
      type: "BODY",
    },
    {
      type: "FOOTER",
      text: "Thank you for shopping with us!",
    },
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "URL",
          text: "Track Order",
          url: "https://example.com/track/{{meeting_url}}",
        },
        {
          type: "PHONE_NUMBER",
          text: "Contact Support",
          phone_number: "+1234567890",
        },
      ],
    },
  ],
  parameter_format: "POSITIONAL",
};

export const mockComplexNamedTemplate: WhatsAppTemplate = {
  id: "1013",
  name: "complex_named_template",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "TEXT",
      text: "Booking Confirmation - {{event_name}}",
    },
    {
      text: "Dear {{organizer_name}}, your booking at {{location}} on {{event_name}} at {{timezone}} has been confirmed.",
      type: "BODY",
    },
    {
      type: "FOOTER",
      text: "We look forward to seeing you!",
    },
  ],
  parameter_format: "NAMED",
};

export const mockMultipleHeaderParams: WhatsAppTemplate = {
  id: "1014",
  name: "multiple_header_params",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "TEXT",
      text: "{{event_name}} - Report for {{timezone}}",
    },
    {
      text: "Please review the attached report.",
      type: "BODY",
    },
  ],
  parameter_format: "POSITIONAL",
};

// ==================== TEST SUITES ====================

describe("WhatsApp Template Component Builder", () => {
  describe("BODY Component - Direct Parameter Matching", () => {
    it("handles body with no parameters", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyOnly,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(0);
    });

    it("builds body with snake_case parameters using direct field names", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "body",
        parameters: [
          { type: "text", text: "John" },
          { type: "text", text: "Team Meeting" },
          { type: "text", text: "Conference Room A" },
        ],
      });
    });

    it("handles missing parameters gracefully", async () => {
      const partialVariableData: VariablesType = {
        ...mockVariableData,
        eventName: undefined,
        location: undefined,
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        partialVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0]).toEqual({ type: "text", text: "John" });
    });

    it("converts non-string values to strings", async () => {
      const customVariableData: VariablesType = {
        ...mockVariableData,
        attendeeName: "42" as any,
        eventName: "true" as any,
        location: "null" as any,
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        customVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toEqual([
        { type: "text", text: "42" },
        { type: "text", text: "true" },
        { type: "text", text: "null" },
      ]);
    });
  });

  describe("BODY Component - Named Parameters", () => {
    it("builds body with named parameters using snake_case field names", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyWithNamedParams,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "body",
        parameters: [
          { type: "text", parameter_name: "attendee_name", text: "John" },
          { type: "text", parameter_name: "event_name", text: "Team Meeting" },
          { type: "text", parameter_name: "timezone", text: "America/New_York" },
        ],
      });
    });

    it("handles missing named parameters", async () => {
      const partialVariableData: VariablesType = {
        ...mockVariableData,
        eventName: undefined,
        timezone: undefined,
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyWithNamedParams,
        partialVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0]).toEqual({
        type: "text",
        parameter_name: "attendee_name",
        text: "John",
      });
    });

    it("only includes parameters that exist in variable data", async () => {
      const templateWithExtra: WhatsAppTemplate = {
        id: "1015",
        name: "template_with_extra",
        status: "APPROVED",
        category: "MARKETING",
        language: "en",
        components: [
          {
            text: "Hello {{attendee_name}}, {{non_existent_field}} at {{location}}.",
            type: "BODY",
          },
        ],
        parameter_format: "NAMED",
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        templateWithExtra,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters.find((p) => p.parameter_name === "non_existent_field")).toBeUndefined();
    });

    it("builds demo_call_reminder template with named parameters", async () => {
      const dataWithEventTime = {
        ...mockVariableData,
        eventTime: "10:00 PM",
        timezone: "IST",
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        demoCallReminderTemplate,
        dataWithEventTime,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("body");
      expect(result[0].parameters).toHaveLength(4);
      expect(result[0].parameters).toEqual([
        { type: "text", parameter_name: "attendee_first_name", text: "John" },
        { type: "text", parameter_name: "event_time", text: "10:00 PM" },
        { type: "text", parameter_name: "timezone", text: "IST" },
        { type: "text", parameter_name: "meeting_url", text: "https://meet.example.com/abc123" },
      ]);
    });
  });

  describe("HEADER Component - Text Format", () => {
    it("does not create header component when text parameter is missing", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockHeaderTextPositional,
        {
          ...mockVariableData,
          attendeeName: undefined,
        },
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(0);
    });

    it("creates header component when text parameter exists", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockHeaderTextPositional,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("header");
    });

    it("creates header with named parameters", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockHeaderTextNamed,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "header",
        parameters: [{ type: "text", parameter_name: "organizer_name", text: "John Organizer" }],
      });
    });
  });

  describe("BUTTONS Component", () => {
    it("does not create components for static buttons", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockButtonsStatic,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(0);
    });

    it("handles dynamic button URL parameters", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockButtonsDynamic,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "https://meet.example.com/abc123" }],
      });
    });

    it("handles missing button parameters", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockButtonsDynamic,
        {
          ...mockVariableData,
          meetingUrl: undefined,
        },
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(0);
    });

    it("handles multiple dynamic buttons", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockButtonsMultipleDynamic,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "https://example.com/cancel/xyz" }],
      });
      expect(result[1]).toEqual({
        type: "button",
        sub_type: "url",
        index: "1",
        parameters: [{ type: "text", text: "https://example.com/reschedule/xyz" }],
      });
    });
  });

  describe("Complex Templates", () => {
    it("builds complex template with body and buttons", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockComplexTemplate,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(2);

      // Body component
      expect(result[0].type).toBe("body");
      expect(result[0].parameters).toHaveLength(3);

      // Button component
      expect(result[1].type).toBe("button");
      expect(result[1].sub_type).toBe("url");
    });

    it("builds complex named parameter template", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockComplexNamedTemplate,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(2);

      // Header with named param
      expect(result[0].type).toBe("header");
      expect(result[0].parameters).toHaveLength(1);

      // Body with multiple named params
      expect(result[1].type).toBe("body");
      expect(result[1].parameters).toHaveLength(4);
    });
  });

  describe("Edge Cases", () => {
    it("handles template with no components", async () => {
      const emptyTemplate: WhatsAppTemplate = {
        id: "9999",
        name: "empty",
        status: "APPROVED",
        category: "MARKETING",
        language: "en",
        components: [],
        parameter_format: "POSITIONAL",
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        emptyTemplate,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(0);
    });

    it("handles undefined values in variable data", async () => {
      const customVariableData: VariablesType = {
        ...mockVariableData,
        attendeeName: undefined,
        eventName: "Team Meeting",
        location: "Conference Room A",
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        customVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2); // Only eventName and location
    });

    it("handles null as a valid parameter value", async () => {
      const customVariableData: VariablesType = {
        ...mockVariableData,
        attendeeName: null as any,
        eventName: "Team Meeting",
        location: null,
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        customVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters[0]).toEqual({ type: "text", text: "null" });
      expect(result[0].parameters[2]).toEqual({ type: "text", text: "null" });
    });

    it("maintains parameter order based on template text", async () => {
      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toEqual([
        { type: "text", text: "John" },
        { type: "text", text: "Team Meeting" },
        { type: "text", text: "Conference Room A" },
      ]);
    });

    it("handles templates with parameters not in variable data", async () => {
      const limitedVariableData: Partial<VariablesType> = {
        attendeeName: "John",
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        limitedVariableData as VariablesType,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0]).toEqual({ type: "text", text: "John" });
    });

    it("only matches snake_case variables, not camelCase", async () => {
      const mixedTemplate: WhatsAppTemplate = {
        id: "1016",
        name: "mixed_case_template",
        status: "APPROVED",
        category: "MARKETING",
        language: "en",
        components: [
          {
            text: "Hello {{attendee_name}}, your {{eventName}} at {{location}}.",
            type: "BODY",
          },
        ],
        parameter_format: "POSITIONAL",
      };

      const result = await buildMetaTemplateComponentsFromTemplate(
        mixedTemplate,
        mockVariableData,
        MOCK_PHONE_NUMBER_ID,
        MOCK_ACCESS_TOKEN
      );

      expect(result).toHaveLength(1);
      // Should only match attendee_name and location (snake_case), not eventName (camelCase)
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters[0]).toEqual({ type: "text", text: "John" });
      expect(result[0].parameters[1]).toEqual({ type: "text", text: "Conference Room A" });
    });
  });

  it("handles eventStartTimeInAttendeeTimezone dayjs object conversion", async () => {
    const timeTemplate: WhatsAppTemplate = {
      id: "1017",
      name: "event_time_template",
      status: "APPROVED",
      category: "UTILITY",
      language: "en",
      components: [
        {
          text: "Your meeting is at {{start_time_tz_booker}}",
          type: "BODY",
        },
      ],
      parameter_format: "POSITIONAL",
    };

    const result = await buildMetaTemplateComponentsFromTemplate(
      timeTemplate,
      mockVariableData,
      MOCK_PHONE_NUMBER_ID,
      MOCK_ACCESS_TOKEN
    );

    expect(result[0].parameters[0].text).toBe("Wed, 17 Dec 2025 19:30:00 GMT");
  });
});

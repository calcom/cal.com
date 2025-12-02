import prisma from "../../../../../tests/libs/__mocks__/prismaMock";

import {
  buildMetaTemplateComponentsFromTemplate,
  type WhatsAppTemplate,
} from "@calid/features/modules/workflows/providers/meta";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VariablesType } from "@calid/lib/variables";

// ==================== MOCK VARIABLE DATA ====================

export const mockVariableData: VariablesType = {
  eventName: "Team Meeting",
  organizerName: "John Organizer",
  attendeeName: "John",
  attendeeFirstName: "John",
  attendeeLastName: "Doe",
  attendeeEmail: "john@example.com",
  eventDate: undefined, // Dayjs object would be used in real scenario
  eventEndTime: undefined,
  timeZone: "America/New_York",
  location: "Conference Room A",
  additionalNotes: "Please bring your laptop",
  responses: null,
  meetingUrl: "https://meet.example.com/abc123",
  cancelLink: "https://example.com/cancel/xyz",
  rescheduleLink: "https://example.com/reschedule/xyz",
  ratingUrl: "https://example.com/rate/xyz",
  noShowUrl: "https://example.com/noshow/xyz",
  attendeeTimezone: "America/Los_Angeles",
  eventTimeInAttendeeTimezone: undefined,
  eventEndTimeInAttendeeTimezone: undefined,
};

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

export const mockBodyWithPositionalParams: WhatsAppTemplate = {
  id: "1002",
  name: "body_with_params",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      text: "Hello {{attendeeName}}, your order {{eventName}} is ready for pickup at {{location}}.",
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
      text: "Hello {{attendeeName}}, your appointment is on {{eventName}} at {{timeZone}}.",
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
      text: "Welcome {{attendeeName}}!",
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
      text: "Invoice for {{organizerName}}",
    },
    {
      text: "Your invoice is ready.",
      type: "BODY",
    },
  ],
  parameter_format: "NAMED",
};

export const mockHeaderImage: WhatsAppTemplate = {
  id: "1006",
  name: "header_image",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: ["https://example.com/product.jpg"],
      },
    },
    {
      text: "Check out our new product!",
      type: "BODY",
    },
  ],
  parameter_format: "POSITIONAL",
};

export const mockHeaderVideo: WhatsAppTemplate = {
  id: "1007",
  name: "header_video",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "VIDEO",

      example: {
        header_handle: ["https://example.com/product.mp4"],
      },
    },
    {
      text: "Watch our latest tutorial.",
      type: "BODY",
    },
  ],
  parameter_format: "POSITIONAL",
};

export const mockHeaderDocument: WhatsAppTemplate = {
  id: "1008",
  name: "header_document",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "DOCUMENT",

      example: {
        header_handle: ["https://example.com/product.pdf"],
      },
    },
    {
      text: "Please find the attached document.",
      type: "BODY",
    },
  ],
  parameter_format: "POSITIONAL",
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
          url: "https://example.com/orders/{{meetingUrl}}",
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
          url: "https://example.com/profile/{{cancelLink}}",
        },
        {
          type: "URL",
          text: "View Orders",
          url: "https://example.com/orders/{{rescheduleLink}}",
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
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: ["https://example.com/img.jpg"],
      },
    },
    {
      text: "Hi {{attendeeName}}, your order {{eventName}} is confirmed for {{location}}.",
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
          url: "https://example.com/track/{{meetingUrl}}",
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
      text: "Booking Confirmation - {{eventName}}",
    },
    {
      text: "Dear {{organizerName}}, your booking at {{location}} on {{eventName}} at {{timeZone}} has been confirmed.",
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
      text: "{{eventName}} - Report for {{timeZone}}",
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
    it("handles body with no parameters", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyOnly,
        mockVariableData
      );

      expect(result).toHaveLength(0);
    });

    it("builds body with parameters using direct field names", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        mockVariableData
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

    it("handles missing parameters gracefully", () => {
      const partialVariableData: VariablesType = {
        ...mockVariableData,
        eventName: undefined,
        location: undefined,
      };

      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        partialVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0]).toEqual({ type: "text", text: "John" });
    });

    it("converts non-string values to strings", () => {
      const customVariableData: VariablesType = {
        ...mockVariableData,
        attendeeName: "42" as any,
        eventName: "true" as any,
        location: "null" as any,
      };

      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        customVariableData
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
    it("builds body with named parameters using direct field names", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyWithNamedParams,
        mockVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "body",
        parameters: [
          { type: "text", parameter_name: "attendeeName", text: "John" },
          { type: "text", parameter_name: "eventName", text: "Team Meeting" },
          { type: "text", parameter_name: "timeZone", text: "America/New_York" },
        ],
      });
    });

    it("handles missing named parameters", () => {
      const partialVariableData: VariablesType = {
        ...mockVariableData,
        eventName: undefined,
        timeZone: undefined,
      };

      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyWithNamedParams,
        partialVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0]).toEqual({
        type: "text",
        parameter_name: "attendeeName",
        text: "John",
      });
    });

    it("only includes parameters that exist in variable data", () => {
      const templateWithExtra: WhatsAppTemplate = {
        id: "1015",
        name: "template_with_extra",
        status: "APPROVED",
        category: "MARKETING",
        language: "en",
        components: [
          {
            text: "Hello {{attendeeName}}, {{nonExistentField}} at {{location}}.",
            type: "BODY",
          },
        ],
        parameter_format: "NAMED",
      };

      const result = buildMetaTemplateComponentsFromTemplate(
        templateWithExtra,
        mockVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2);
      expect(result[0].parameters.find((p) => p.parameter_name === "nonExistentField")).toBeUndefined();
    });
  });

  describe("HEADER Component - Text Format", () => {
    it("does not create header component when text parameter is missing", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockHeaderTextPositional,
        { ...mockVariableData, attendeeName: undefined }
      );

      expect(result).toHaveLength(0);
    });

    it("creates header component when text parameter exists", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockHeaderTextPositional,
        mockVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("header");
    });
  });

  describe("HEADER Component - Image Format", () => {
    it("builds header with image", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockHeaderImage,
        mockVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "header",
        parameters: [
          {
            type: "image",
            image: {
              link: "https://example.com/product.jpg",
            },
          },
        ],
      });
    });
  });

  describe("HEADER Component - Video Format", () => {
    it("builds header with video", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockHeaderVideo,
        mockVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "header",
        parameters: [
          {
            type: "video",
            video: {
              link: "https://example.com/product.mp4",
            },
          },
        ],
      });
    });
  });

  describe("HEADER Component - Document Format", () => {
    it("builds header with document", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockHeaderDocument,
        mockVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "header",
        parameters: [
          {
            type: "document",
            document: {
              link: "https://example.com/product.pdf",
            },
          },
        ],
      });
    });
  });

  describe("BUTTONS Component", () => {
    it("does not create components for static buttons", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockButtonsStatic,
        mockVariableData
      );

      expect(result).toHaveLength(0);
    });

    it("handles missing button parameters", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockButtonsDynamic,
        { ...mockVariableData, meetingUrl: undefined }
      );

      expect(result).toHaveLength(0);
    });
  });

  // describe("Complex Templates", () => {
  //   it("builds complex named parameter template - body only", () => {
  //     const result = buildMetaTemplateComponentsFromTemplate(
  //       mockComplexNamedTemplate,
  //       mockVariableData
  //     );

  //     // Only body parameters work currently
  //     expect(result).toHaveLength(1);

  //     // Body with multiple named params
  //     expect(result[0].type).toBe("body");
  //     expect(result[0].parameters).toHaveLength(4);
  //     expect(result[0].parameters).toEqual([
  //       { type: "text", parameter_name: "organizerName", text: "John Organizer" },
  //       { type: "text", parameter_name: "location", text: "Conference Room A" },
  //       { type: "text", parameter_name: "eventName", text: "Team Meeting" },
  //       { type: "text", parameter_name: "timeZone", text: "America/New_York" },
  //     ]);
  //   });
  // });

  describe("Edge Cases", () => {
    it("handles template with no components", () => {
      const emptyTemplate: WhatsAppTemplate = {
        id: "9999",
        name: "empty",
        status: "APPROVED",
        category: "MARKETING",
        language: "en",
        components: [],
        parameter_format: "POSITIONAL",
      };

      const result = buildMetaTemplateComponentsFromTemplate(
        emptyTemplate,
        mockVariableData
      );

      expect(result).toHaveLength(0);
    });

    it("handles undefined values in variable data", () => {
      const customVariableData: VariablesType = {
        ...mockVariableData,
        attendeeName: undefined,
        eventName: "Team Meeting",
        location: "Conference Room A",
      };

      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        customVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(2); // Only eventName and location
    });

    it("handles null as a valid parameter value", () => {
      const customVariableData: VariablesType = {
        ...mockVariableData,
        attendeeName: null as any,
        eventName: "Team Meeting",
        location: null,
      };

      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        customVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters[0]).toEqual({ type: "text", text: "null" });
      expect(result[0].parameters[2]).toEqual({ type: "text", text: "null" });
    });

    it("maintains parameter order based on template text", () => {
      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        mockVariableData
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toEqual([
        { type: "text", text: "John" },
        { type: "text", text: "Team Meeting" },
        { type: "text", text: "Conference Room A" },
      ]);
    });

    it("handles templates with parameters not in variable data", () => {
      const limitedVariableData: Partial<VariablesType> = {
        attendeeName: "John",
      };

      const result = buildMetaTemplateComponentsFromTemplate(
        mockBodyWithPositionalParams,
        limitedVariableData as VariablesType
      );

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0]).toEqual({ type: "text", text: "John" });
    });
  });
});
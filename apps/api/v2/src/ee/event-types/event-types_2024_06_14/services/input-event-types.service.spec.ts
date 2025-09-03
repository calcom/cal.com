import { Test, TestingModule } from "@nestjs/testing";

import type { InputBookingField_2024_06_14 } from "@calcom/platform-types";

import { CalendarsService } from "../../../calendars/services/calendars.service";
import { EventTypesRepository_2024_06_14 } from "../event-types.repository";
import { InputEventTypesService_2024_06_14 } from "./input-event-types.service";

describe("InputEventTypesService_2024_06_14", () => {
  let service: InputEventTypesService_2024_06_14;
  let eventTypesRepository: EventTypesRepository_2024_06_14;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputEventTypesService_2024_06_14,
        {
          provide: EventTypesRepository_2024_06_14,
          useValue: {
            getEventTypeWithBookingFields: jest.fn(),
            getEventTypeWithMetaData: jest.fn(),
          },
        },
        {
          provide: CalendarsService,
          useValue: {
            getCalendars: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InputEventTypesService_2024_06_14>(InputEventTypesService_2024_06_14);
    eventTypesRepository = module.get<EventTypesRepository_2024_06_14>(EventTypesRepository_2024_06_14);

    jest.clearAllMocks();
  });

  describe("mergeBookingFields", () => {
    const existingEmailField: InputBookingField_2024_06_14 = {
      type: "email",
      label: "Your email",
      required: true,
    };

    const existingPhoneField: InputBookingField_2024_06_14 = {
      type: "phone",
      slug: "phone",
      label: "Your phone",
      required: true,
    };

    const existingTitleField: InputBookingField_2024_06_14 = {
      slug: "title",
      label: "Meeting title",
      required: false,
    };

    const newAddressField: InputBookingField_2024_06_14 = {
      type: "address",
      slug: "address",
      label: "Your address",
      required: true,
    };

    const updatedPhoneField: InputBookingField_2024_06_14 = {
      type: "phone",
      slug: "phone",
      label: "Updated phone label",
      required: false,
    };

    it("should return new fields when existing fields are null", () => {
      const newFields = [existingEmailField, newAddressField];

      const result = service["mergeBookingFields"](null, newFields);

      expect(result).toEqual(newFields);
    });

    it("should return new fields when existing fields are empty array", () => {
      const newFields = [existingEmailField, newAddressField];

      const result = service["mergeBookingFields"]([], newFields);

      expect(result).toEqual(newFields);
    });

    it("should preserve existing fields and add new fields", () => {
      const existingFields = [existingEmailField, existingPhoneField];
      const newFields = [newAddressField];

      const result = service["mergeBookingFields"](existingFields, newFields);

      expect(result).toHaveLength(3);
      expect(result).toContain(existingEmailField);
      expect(result).toContain(existingPhoneField);
      expect(result).toContain(newAddressField);
    });

    it("should update existing fields with new values while preserving others", () => {
      const existingFields = [existingEmailField, existingPhoneField];
      const newFields = [updatedPhoneField];

      const result = service["mergeBookingFields"](existingFields, newFields);

      expect(result).toHaveLength(2);
      expect(result).toContain(existingEmailField);
      expect(result).toContain(updatedPhoneField);
      expect(result).not.toContain(existingPhoneField);
      expect(result.find((f: InputBookingField_2024_06_14) => "type" in f && f.type === "phone")).toEqual(
        updatedPhoneField
      );
    });

    it("should preserve existing fields and update matching ones", () => {
      const existingFields = [existingEmailField, existingPhoneField, existingTitleField];
      const newFields = [existingEmailField];

      const result = service["mergeBookingFields"](existingFields, newFields);

      expect(result).toHaveLength(3);
      expect(result).toContain(existingEmailField);
      expect(result).toContain(existingPhoneField);
      expect(result).toContain(existingTitleField);
    });

    it("should merge existing and new fields correctly", () => {
      const existingFields = [existingEmailField, existingPhoneField, existingTitleField];
      const newFields = [existingEmailField, updatedPhoneField, newAddressField];

      const result = service["mergeBookingFields"](existingFields, newFields);

      expect(result).toHaveLength(4);
      expect(result).toContain(existingEmailField);
      expect(result).toContain(updatedPhoneField);
      expect(result).toContain(existingTitleField);
      expect(result).toContain(newAddressField);
      expect(result.find((f: InputBookingField_2024_06_14) => "type" in f && f.type === "phone")).toEqual(
        updatedPhoneField
      );
    });

    it("should identify fields by slug for custom fields", () => {
      const existingCustomField: InputBookingField_2024_06_14 = {
        type: "text",
        slug: "custom-field",
        label: "Custom field",
        required: true,
      };

      const updatedCustomField: InputBookingField_2024_06_14 = {
        type: "text",
        slug: "custom-field",
        label: "Updated custom field",
        required: false,
      };

      const existingFields = [existingCustomField];
      const newFields = [updatedCustomField];

      const result = service["mergeBookingFields"](existingFields, newFields);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(updatedCustomField);
    });

    it("should identify fields by type for system fields", () => {
      const existingSystemField: InputBookingField_2024_06_14 = {
        type: "name",
        label: "Your name",
      };

      const updatedSystemField: InputBookingField_2024_06_14 = {
        type: "name",
        label: "Updated name label",
      };

      const existingFields = [existingSystemField];
      const newFields = [updatedSystemField];

      const result = service["mergeBookingFields"](existingFields, newFields);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(updatedSystemField);
    });
  });

  describe("transformInputUpdateEventType integration", () => {
    const mockEventTypeId = 123;
    const mockExistingBookingFields = [
      {
        type: "email",
        label: "Your email",
        required: true,
      },
      {
        type: "phone",
        slug: "phone",
        label: "Your phone",
        required: true,
      },
    ];

    beforeEach(() => {
      (eventTypesRepository.getEventTypeWithBookingFields as jest.Mock).mockResolvedValue({
        bookingFields: mockExistingBookingFields,
      });

      (eventTypesRepository.getEventTypeWithMetaData as jest.Mock).mockResolvedValue({
        metadata: {},
      });
    });

    it("should merge booking fields when updating event type", async () => {
      const newBookingFields: InputBookingField_2024_06_14[] = [
        {
          type: "address",
          slug: "address",
          label: "Your address",
          required: true,
        },
      ];

      const inputEventType = {
        bookingFields: newBookingFields,
      };

      const result = await service.transformInputUpdateEventType(inputEventType, mockEventTypeId);

      expect(eventTypesRepository.getEventTypeWithBookingFields).toHaveBeenCalledWith(mockEventTypeId);
      expect(result.bookingFields).toBeDefined();
      expect(result.bookingFields!.length).toBeGreaterThan(0);
      const addressField = result.bookingFields!.find((f: any) => f.type === "address");
      expect(addressField).toBeDefined();
      expect(addressField!.label).toBe("Your address");
    });

    it("should not modify booking fields when none provided", async () => {
      const inputEventType = {
        title: "Updated title",
      };

      const result = await service.transformInputUpdateEventType(inputEventType, mockEventTypeId);

      expect(eventTypesRepository.getEventTypeWithBookingFields).toHaveBeenCalledWith(mockEventTypeId);
      expect(result.bookingFields).toBeUndefined();
    });

    it("should handle empty existing booking fields", async () => {
      (eventTypesRepository.getEventTypeWithBookingFields as jest.Mock).mockResolvedValue({
        bookingFields: null,
      });

      const newBookingFields: InputBookingField_2024_06_14[] = [
        {
          type: "email",
          label: "Your email",
          required: true,
        },
      ];

      const inputEventType = {
        bookingFields: newBookingFields,
      };

      const result = await service.transformInputUpdateEventType(inputEventType, mockEventTypeId);

      expect(result.bookingFields).toBeDefined();
      expect(result.bookingFields!.length).toBeGreaterThan(0);
      const emailField = result.bookingFields!.find((f: any) => f.type === "email");
      expect(emailField).toBeDefined();
      expect(emailField!.label).toBe("Your email");
    });
  });
});

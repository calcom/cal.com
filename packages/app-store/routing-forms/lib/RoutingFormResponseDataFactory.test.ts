import { describe, it, expect, beforeEach, vi } from "vitest";

import type { RoutingFormResponseRepositoryInterface } from "@calcom/lib/server/repository/RoutingFormResponseRepository.interface";

import { RoutingFormResponseDataFactory } from "./RoutingFormResponseDataFactory";
import { parseRoutingFormResponse } from "./responseData/parseRoutingFormResponse";

vi.mock("./responseData/parseRoutingFormResponse", () => ({
  parseRoutingFormResponse: vi.fn(),
}));

const mockLogger = {
  getSubLogger: () => ({
    error: vi.fn(),
  }),
};

const mockRoutingFormResponseRepo: RoutingFormResponseRepositoryInterface = {
  findByBookingUidIncludeForm: vi.fn(),
  findByIdIncludeForm: vi.fn(),
};

describe("RoutingFormResponseDataFactory", () => {
  let factory: RoutingFormResponseDataFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    factory = new RoutingFormResponseDataFactory({
      logger: mockLogger as any,
      routingFormResponseRepo: mockRoutingFormResponseRepo,
    });
  });

  describe("createWithBookingUid", () => {
    it("should call parseRoutingFormResponse with correct data when form response is found", async () => {
      const mockFormResponse = {
        id: 1,
        response: { name: "test" },
        form: { fields: [{ label: "name", type: "text" }] },
      };
      const bookingUid = "test-uid";
      vi.mocked(mockRoutingFormResponseRepo.findByBookingUidIncludeForm).mockResolvedValue(
        mockFormResponse as any
      );

      const result = await factory.createWithBookingUid(bookingUid);

      expect(mockRoutingFormResponseRepo.findByBookingUidIncludeForm).toHaveBeenCalledWith(bookingUid);
      expect(parseRoutingFormResponse).toHaveBeenCalledWith(
        mockFormResponse.response,
        mockFormResponse.form.fields
      );
    });

    it("should throw an error if form response is not found", async () => {
      const bookingUid = "test-uid";
      vi.mocked(mockRoutingFormResponseRepo.findByBookingUidIncludeForm).mockResolvedValue(null);

      await expect(factory.createWithBookingUid(bookingUid)).rejects.toThrow("Form response not found");

      expect(mockRoutingFormResponseRepo.findByBookingUidIncludeForm).toHaveBeenCalledWith(bookingUid);
      expect(parseRoutingFormResponse).not.toHaveBeenCalled();
    });
  });

  describe("createWithResponseId", () => {
    it("should call parseRoutingFormResponse with correct data when form response is found", async () => {
      const mockFormResponse = {
        id: 1,
        response: { email: "test@example.com" },
        form: { fields: [{ label: "email", type: "email" }] },
      };
      const responseId = 1;
      vi.mocked(mockRoutingFormResponseRepo.findByIdIncludeForm).mockResolvedValue(mockFormResponse as any);

      const result = await factory.createWithResponseId(responseId);

      expect(mockRoutingFormResponseRepo.findByIdIncludeForm).toHaveBeenCalledWith(responseId);
      expect(parseRoutingFormResponse).toHaveBeenCalledWith(
        mockFormResponse.response,
        mockFormResponse.form.fields
      );
    });

    it("should throw an error if form response is not found", async () => {
      const responseId = 1;
      vi.mocked(mockRoutingFormResponseRepo.findByIdIncludeForm).mockResolvedValue(null);

      await expect(factory.createWithResponseId(responseId)).rejects.toThrow("Form response not found");

      expect(mockRoutingFormResponseRepo.findByIdIncludeForm).toHaveBeenCalledWith(responseId);
      expect(parseRoutingFormResponse).not.toHaveBeenCalled();
    });
  });
});

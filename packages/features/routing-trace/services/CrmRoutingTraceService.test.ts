import { beforeEach, describe, expect, it, vi } from "vitest";

import { CrmRoutingTraceService } from "./CrmRoutingTraceService";
import type { RoutingTraceService } from "./RoutingTraceService";

describe("CrmRoutingTraceService", () => {
  let mockParentTraceService: Pick<RoutingTraceService, "addStep">;

  function createMockRoutingTraceService(): Pick<RoutingTraceService, "addStep"> {
    return {
      addStep: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockParentTraceService = createMockRoutingTraceService();
  });

  describe("create", () => {
    it("should return undefined when parent is undefined", () => {
      const result = CrmRoutingTraceService.create(undefined);

      expect(result).toBeUndefined();
    });

    it("should return a CrmRoutingTraceService instance when parent is provided", () => {
      const result = CrmRoutingTraceService.create(mockParentTraceService as RoutingTraceService);

      expect(result).toBeInstanceOf(CrmRoutingTraceService);
    });
  });

  describe("addStep", () => {
    it("should delegate to parent trace service with correct parameters", () => {
      const crmTrace = new CrmRoutingTraceService(mockParentTraceService as RoutingTraceService);

      crmTrace.addStep("salesforce", "account_lookup", { accountId: "123" });

      expect(mockParentTraceService.addStep).toHaveBeenCalledWith({
        domain: "salesforce",
        step: "account_lookup",
        data: { accountId: "123" },
      });
    });

    it("should use empty object as default data when not provided", () => {
      const crmTrace = new CrmRoutingTraceService(mockParentTraceService as RoutingTraceService);

      crmTrace.addStep("hubspot", "contact_search");

      expect(mockParentTraceService.addStep).toHaveBeenCalledWith({
        domain: "hubspot",
        step: "contact_search",
        data: {},
      });
    });

    it("should pass complex data objects correctly", () => {
      const crmTrace = new CrmRoutingTraceService(mockParentTraceService as RoutingTraceService);
      const complexData = {
        email: "test@example.com",
        recordType: "Contact",
        recordId: "003ABC123",
        nested: { key: "value" },
      };

      crmTrace.addStep("salesforce", "contact_owner_lookup", complexData);

      expect(mockParentTraceService.addStep).toHaveBeenCalledWith({
        domain: "salesforce",
        step: "contact_owner_lookup",
        data: complexData,
      });
    });

    it("should allow multiple steps to be added", () => {
      const crmTrace = new CrmRoutingTraceService(mockParentTraceService as RoutingTraceService);

      crmTrace.addStep("salesforce", "step1", { data: 1 });
      crmTrace.addStep("salesforce", "step2", { data: 2 });
      crmTrace.addStep("salesforce", "step3", { data: 3 });

      expect(mockParentTraceService.addStep).toHaveBeenCalledTimes(3);
    });
  });

  describe("constructor", () => {
    it("should create instance with parent trace service", () => {
      const crmTrace = new CrmRoutingTraceService(mockParentTraceService as RoutingTraceService);

      expect(crmTrace).toBeInstanceOf(CrmRoutingTraceService);
    });
  });
});

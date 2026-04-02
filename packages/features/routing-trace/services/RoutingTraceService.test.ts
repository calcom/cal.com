import type { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  IPendingRoutingTraceRepository,
  PendingRoutingTraceRecord,
} from "../repositories/PendingRoutingTraceRepository.interface";
import type { IRoutingTraceRepository } from "../repositories/RoutingTraceRepository.interface";
import { RoutingTraceService } from "./RoutingTraceService";

describe("RoutingTraceService", () => {
  let service: RoutingTraceService;
  let mockPendingRoutingTraceRepository: IPendingRoutingTraceRepository;
  let mockRoutingTraceRepository: IRoutingTraceRepository;
  let mockAssignmentReasonRepository: Pick<AssignmentReasonRepository, "createAssignmentReason">;

  function createMockPendingRoutingTraceRepository(): IPendingRoutingTraceRepository {
    return {
      create: vi.fn(),
      findByFormResponseId: vi.fn(),
      findByQueuedFormResponseId: vi.fn(),
    };
  }

  function createMockRoutingTraceRepository(): IRoutingTraceRepository {
    return {
      create: vi.fn(),
    };
  }

  function createMockAssignmentReasonRepository(): Pick<
    AssignmentReasonRepository,
    "createAssignmentReason"
  > {
    return {
      createAssignmentReason: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockPendingRoutingTraceRepository = createMockPendingRoutingTraceRepository();
    mockRoutingTraceRepository = createMockRoutingTraceRepository();
    mockAssignmentReasonRepository = createMockAssignmentReasonRepository();
    service = new RoutingTraceService({
      pendingRoutingTraceRepository: mockPendingRoutingTraceRepository,
      routingTraceRepository: mockRoutingTraceRepository,
      assignmentReasonRepository: mockAssignmentReasonRepository as AssignmentReasonRepository,
    });
  });

  describe("addStep", () => {
    it("should add a step to the routing trace", () => {
      service.addStep({
        domain: "routing_form",
        step: "attribute-logic-evaluated",
        data: { routeIsFallback: false },
      });

      expect(service.getStepsCount()).toBe(1);
    });

    it("should add multiple steps to the routing trace", () => {
      service.addStep({
        domain: "routing_form",
        step: "attribute-logic-evaluated",
        data: { routeIsFallback: false },
      });

      service.addStep({
        domain: "salesforce",
        step: "salesforce_assignment",
        data: { email: "owner@example.com" },
      });

      expect(service.getStepsCount()).toBe(2);
    });

    it("should add step with empty data by default", () => {
      service.addStep({
        domain: "test_domain",
        step: "test_step",
      });

      expect(service.getStepsCount()).toBe(1);
    });
  });

  describe("getStepsCount", () => {
    it("should return 0 when no steps have been added", () => {
      expect(service.getStepsCount()).toBe(0);
    });

    it("should return correct count after adding steps", () => {
      service.addStep({ domain: "test", step: "step1" });
      service.addStep({ domain: "test", step: "step2" });
      service.addStep({ domain: "test", step: "step3" });

      expect(service.getStepsCount()).toBe(3);
    });
  });

  describe("savePendingRoutingTrace", () => {
    it("should save pending trace with formResponseId", async () => {
      service.addStep({
        domain: "routing_form",
        step: "attribute-logic-evaluated",
        data: { routeIsFallback: false },
      });

      await service.savePendingRoutingTrace({ formResponseId: 123 });

      expect(mockPendingRoutingTraceRepository.create).toHaveBeenCalledWith({
        trace: expect.arrayContaining([
          expect.objectContaining({
            domain: "routing_form",
            step: "attribute-logic-evaluated",
            data: { routeIsFallback: false },
          }),
        ]),
        formResponseId: 123,
      });
    });

    it("should save pending trace with queuedFormResponseId", async () => {
      service.addStep({
        domain: "routing_form",
        step: "attribute-logic-evaluated",
        data: { routeIsFallback: true },
      });

      await service.savePendingRoutingTrace({ queuedFormResponseId: "queued-123" });

      expect(mockPendingRoutingTraceRepository.create).toHaveBeenCalledWith({
        trace: expect.arrayContaining([
          expect.objectContaining({
            domain: "routing_form",
            step: "attribute-logic-evaluated",
            data: { routeIsFallback: true },
          }),
        ]),
        queuedFormResponseId: "queued-123",
      });
    });
  });

  describe("processForBooking", () => {
    const baseProcessArgs = {
      bookingId: 1,
      bookingUid: "booking-uid-123",
      organizerEmail: "organizer@example.com",
      isRerouting: false,
    };

    it("should return null if no pending trace is found", async () => {
      vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(null);

      const result = await service.processForBooking({
        ...baseProcessArgs,
        formResponseId: 123,
      });

      expect(result).toBeNull();
    });

    it("should return null if no pending trace is found for queuedFormResponseId", async () => {
      vi.mocked(mockPendingRoutingTraceRepository.findByQueuedFormResponseId).mockResolvedValue(null);

      const result = await service.processForBooking({
        ...baseProcessArgs,
        queuedFormResponseId: "queued-123",
      });

      expect(result).toBeNull();
    });

    describe("routing form assignment", () => {
      it("should extract ROUTING_FORM_ROUTING assignment reason", async () => {
        const pendingTrace: PendingRoutingTraceRecord = {
          id: "pending-1",
          createdAt: new Date(),
          trace: [
            {
              domain: "routing_form",
              step: "attribute-logic-evaluated",
              timestamp: Date.now(),
              data: { routeIsFallback: false },
            },
          ],
          formResponseId: 123,
          queuedFormResponseId: null,
        };

        vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(pendingTrace);
        vi.mocked(mockAssignmentReasonRepository.createAssignmentReason).mockResolvedValue({
          id: 1,
          bookingId: 1,
          reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING,
          reasonString: "",
        });
        vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
          id: "trace-1",
          createdAt: new Date(),
          trace: pendingTrace.trace,
          formResponseId: 123,
          queuedFormResponseId: null,
          bookingUid: "booking-uid-123",
          assignmentReasonId: 1,
        });

        const result = await service.processForBooking({
          ...baseProcessArgs,
          formResponseId: 123,
        });

        expect(result).toEqual({
          assignmentReason: {
            reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING,
            reasonString: "",
          },
        });
        expect(mockAssignmentReasonRepository.createAssignmentReason).toHaveBeenCalledWith({
          bookingId: 1,
          reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING,
          reasonString: "",
        });
      });

      it("should extract ROUTING_FORM_ROUTING_FALLBACK assignment reason when routeIsFallback is true", async () => {
        const pendingTrace: PendingRoutingTraceRecord = {
          id: "pending-1",
          createdAt: new Date(),
          trace: [
            {
              domain: "routing_form",
              step: "attribute-logic-evaluated",
              timestamp: Date.now(),
              data: { routeIsFallback: true },
            },
          ],
          formResponseId: 123,
          queuedFormResponseId: null,
        };

        vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(pendingTrace);
        vi.mocked(mockAssignmentReasonRepository.createAssignmentReason).mockResolvedValue({
          id: 1,
          bookingId: 1,
          reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING_FALLBACK,
          reasonString: "",
        });
        vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
          id: "trace-1",
          createdAt: new Date(),
          trace: pendingTrace.trace,
          formResponseId: 123,
          queuedFormResponseId: null,
          bookingUid: "booking-uid-123",
          assignmentReasonId: 1,
        });

        const result = await service.processForBooking({
          ...baseProcessArgs,
          formResponseId: 123,
        });

        expect(result).toEqual({
          assignmentReason: {
            reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING_FALLBACK,
            reasonString: "",
          },
        });
      });

      it("should extract REROUTED assignment reason when isRerouting is true", async () => {
        const pendingTrace: PendingRoutingTraceRecord = {
          id: "pending-1",
          createdAt: new Date(),
          trace: [
            {
              domain: "routing_form",
              step: "attribute-logic-evaluated",
              timestamp: Date.now(),
              data: { routeIsFallback: false },
            },
          ],
          formResponseId: 123,
          queuedFormResponseId: null,
        };

        vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(pendingTrace);
        vi.mocked(mockAssignmentReasonRepository.createAssignmentReason).mockResolvedValue({
          id: 1,
          bookingId: 1,
          reasonEnum: AssignmentReasonEnum.REROUTED,
          reasonString: "Rerouted by admin@example.com",
        });
        vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
          id: "trace-1",
          createdAt: new Date(),
          trace: pendingTrace.trace,
          formResponseId: 123,
          queuedFormResponseId: null,
          bookingUid: "booking-uid-123",
          assignmentReasonId: 1,
        });

        const result = await service.processForBooking({
          ...baseProcessArgs,
          formResponseId: 123,
          isRerouting: true,
          reroutedByEmail: "admin@example.com",
        });

        expect(result).toEqual({
          assignmentReason: {
            reasonEnum: AssignmentReasonEnum.REROUTED,
            reasonString: "Rerouted by admin@example.com",
          },
        });
      });
    });

    describe("salesforce assignment", () => {
      it("should extract SALESFORCE_ASSIGNMENT when organizer matches CRM contact owner", async () => {
        const pendingTrace: PendingRoutingTraceRecord = {
          id: "pending-1",
          createdAt: new Date(),
          trace: [
            {
              domain: "salesforce",
              step: "salesforce_assignment",
              timestamp: Date.now(),
              data: {
                email: "organizer@example.com",
                recordType: "Contact",
                recordId: "003ABC123",
              },
            },
          ],
          formResponseId: 123,
          queuedFormResponseId: null,
        };

        vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(pendingTrace);
        vi.mocked(mockAssignmentReasonRepository.createAssignmentReason).mockResolvedValue({
          id: 1,
          bookingId: 1,
          reasonEnum: AssignmentReasonEnum.SALESFORCE_ASSIGNMENT,
          reasonString: "Salesforce contact owner: organizer@example.com (Contact ID: 003ABC123)",
        });
        vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
          id: "trace-1",
          createdAt: new Date(),
          trace: pendingTrace.trace,
          formResponseId: 123,
          queuedFormResponseId: null,
          bookingUid: "booking-uid-123",
          assignmentReasonId: 1,
        });

        const result = await service.processForBooking({
          ...baseProcessArgs,
          formResponseId: 123,
        });

        expect(result).toEqual({
          assignmentReason: {
            reasonEnum: AssignmentReasonEnum.SALESFORCE_ASSIGNMENT,
            reasonString: "Salesforce contact owner: organizer@example.com (Contact ID: 003ABC123)",
          },
        });
      });

      it("should use account lookup field reason string when rrSkipToAccountLookupField is true", async () => {
        const pendingTrace: PendingRoutingTraceRecord = {
          id: "pending-1",
          createdAt: new Date(),
          trace: [
            {
              domain: "salesforce",
              step: "salesforce_assignment",
              timestamp: Date.now(),
              data: {
                email: "organizer@example.com",
                recordType: "Account",
                recordId: "001ABC123",
                rrSkipToAccountLookupField: true,
                rrSKipToAccountLookupFieldName: "Account_Owner__c",
              },
            },
          ],
          formResponseId: 123,
          queuedFormResponseId: null,
        };

        vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(pendingTrace);
        vi.mocked(mockAssignmentReasonRepository.createAssignmentReason).mockResolvedValue({
          id: 1,
          bookingId: 1,
          reasonEnum: AssignmentReasonEnum.SALESFORCE_ASSIGNMENT,
          reasonString:
            "Salesforce account lookup field: Account_Owner__c - organizer@example.com (Account ID: 001ABC123)",
        });
        vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
          id: "trace-1",
          createdAt: new Date(),
          trace: pendingTrace.trace,
          formResponseId: 123,
          queuedFormResponseId: null,
          bookingUid: "booking-uid-123",
          assignmentReasonId: 1,
        });

        const result = await service.processForBooking({
          ...baseProcessArgs,
          formResponseId: 123,
        });

        expect(result).toEqual({
          assignmentReason: {
            reasonEnum: AssignmentReasonEnum.SALESFORCE_ASSIGNMENT,
            reasonString:
              "Salesforce account lookup field: Account_Owner__c - organizer@example.com (Account ID: 001ABC123)",
          },
        });
      });

      it("should fall back to routing form assignment when organizer does not match CRM contact owner", async () => {
        const pendingTrace: PendingRoutingTraceRecord = {
          id: "pending-1",
          createdAt: new Date(),
          trace: [
            {
              domain: "salesforce",
              step: "salesforce_assignment",
              timestamp: Date.now(),
              data: {
                email: "different-owner@example.com",
                recordType: "Contact",
                recordId: "003ABC123",
              },
            },
            {
              domain: "routing_form",
              step: "attribute-logic-evaluated",
              timestamp: Date.now(),
              data: { routeIsFallback: false },
            },
          ],
          formResponseId: 123,
          queuedFormResponseId: null,
        };

        vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(pendingTrace);
        vi.mocked(mockAssignmentReasonRepository.createAssignmentReason).mockResolvedValue({
          id: 1,
          bookingId: 1,
          reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING,
          reasonString: "",
        });
        vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
          id: "trace-1",
          createdAt: new Date(),
          trace: pendingTrace.trace,
          formResponseId: 123,
          queuedFormResponseId: null,
          bookingUid: "booking-uid-123",
          assignmentReasonId: 1,
        });

        const result = await service.processForBooking({
          ...baseProcessArgs,
          formResponseId: 123,
        });

        expect(result).toEqual({
          assignmentReason: {
            reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING,
            reasonString: "",
          },
        });
      });

      it("should handle case-insensitive email matching for CRM assignment", async () => {
        const pendingTrace: PendingRoutingTraceRecord = {
          id: "pending-1",
          createdAt: new Date(),
          trace: [
            {
              domain: "salesforce",
              step: "salesforce_assignment",
              timestamp: Date.now(),
              data: {
                email: "ORGANIZER@EXAMPLE.COM",
                recordType: "Contact",
                recordId: "003ABC123",
              },
            },
          ],
          formResponseId: 123,
          queuedFormResponseId: null,
        };

        vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(pendingTrace);
        vi.mocked(mockAssignmentReasonRepository.createAssignmentReason).mockResolvedValue({
          id: 1,
          bookingId: 1,
          reasonEnum: AssignmentReasonEnum.SALESFORCE_ASSIGNMENT,
          reasonString: "Salesforce contact owner: ORGANIZER@EXAMPLE.COM (Contact ID: 003ABC123)",
        });
        vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
          id: "trace-1",
          createdAt: new Date(),
          trace: pendingTrace.trace,
          formResponseId: 123,
          queuedFormResponseId: null,
          bookingUid: "booking-uid-123",
          assignmentReasonId: 1,
        });

        const result = await service.processForBooking({
          ...baseProcessArgs,
          formResponseId: 123,
        });

        expect(result?.assignmentReason?.reasonEnum).toBe(AssignmentReasonEnum.SALESFORCE_ASSIGNMENT);
      });
    });

    it("should create permanent routing trace with assignment reason", async () => {
      const pendingTrace: PendingRoutingTraceRecord = {
        id: "pending-1",
        createdAt: new Date(),
        trace: [
          {
            domain: "routing_form",
            step: "attribute-logic-evaluated",
            timestamp: Date.now(),
            data: { routeIsFallback: false },
          },
        ],
        formResponseId: 123,
        queuedFormResponseId: null,
      };

      vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(pendingTrace);
      vi.mocked(mockAssignmentReasonRepository.createAssignmentReason).mockResolvedValue({
        id: 42,
        bookingId: 1,
        reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING,
        reasonString: "",
      });
      vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
        id: "trace-1",
        createdAt: new Date(),
        trace: pendingTrace.trace,
        formResponseId: 123,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-123",
        assignmentReasonId: 42,
      });

      await service.processForBooking({
        ...baseProcessArgs,
        formResponseId: 123,
      });

      expect(mockRoutingTraceRepository.create).toHaveBeenCalledWith({
        trace: pendingTrace.trace,
        formResponseId: 123,
        queuedFormResponseId: undefined,
        bookingUid: "booking-uid-123",
        assignmentReasonId: 42,
      });
    });

    it("should handle pending trace without assignment reason data", async () => {
      const pendingTrace: PendingRoutingTraceRecord = {
        id: "pending-1",
        createdAt: new Date(),
        trace: [
          {
            domain: "other_domain",
            step: "some_step",
            timestamp: Date.now(),
            data: {},
          },
        ],
        formResponseId: 123,
        queuedFormResponseId: null,
      };

      vi.mocked(mockPendingRoutingTraceRepository.findByFormResponseId).mockResolvedValue(pendingTrace);
      vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
        id: "trace-1",
        createdAt: new Date(),
        trace: pendingTrace.trace,
        formResponseId: 123,
        queuedFormResponseId: null,
        bookingUid: "booking-uid-123",
        assignmentReasonId: null,
      });

      const result = await service.processForBooking({
        ...baseProcessArgs,
        formResponseId: 123,
      });

      expect(result).toEqual({
        assignmentReason: undefined,
      });
      expect(mockAssignmentReasonRepository.createAssignmentReason).not.toHaveBeenCalled();
      expect(mockRoutingTraceRepository.create).toHaveBeenCalledWith({
        trace: pendingTrace.trace,
        formResponseId: 123,
        queuedFormResponseId: undefined,
        bookingUid: "booking-uid-123",
        assignmentReasonId: undefined,
      });
    });

    it("should process pending trace found by queuedFormResponseId", async () => {
      const pendingTrace: PendingRoutingTraceRecord = {
        id: "pending-1",
        createdAt: new Date(),
        trace: [
          {
            domain: "routing_form",
            step: "attribute-logic-evaluated",
            timestamp: Date.now(),
            data: { routeIsFallback: false },
          },
        ],
        formResponseId: null,
        queuedFormResponseId: "queued-123",
      };

      vi.mocked(mockPendingRoutingTraceRepository.findByQueuedFormResponseId).mockResolvedValue(pendingTrace);
      vi.mocked(mockAssignmentReasonRepository.createAssignmentReason).mockResolvedValue({
        id: 1,
        bookingId: 1,
        reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING,
        reasonString: "",
      });
      vi.mocked(mockRoutingTraceRepository.create).mockResolvedValue({
        id: "trace-1",
        createdAt: new Date(),
        trace: pendingTrace.trace,
        formResponseId: null,
        queuedFormResponseId: "queued-123",
        bookingUid: "booking-uid-123",
        assignmentReasonId: 1,
      });

      const result = await service.processForBooking({
        ...baseProcessArgs,
        queuedFormResponseId: "queued-123",
      });

      expect(mockPendingRoutingTraceRepository.findByQueuedFormResponseId).toHaveBeenCalledWith("queued-123");
      expect(result?.assignmentReason?.reasonEnum).toBe(AssignmentReasonEnum.ROUTING_FORM_ROUTING);
    });
  });
});

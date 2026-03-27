import type { RoutingFormResponseRepositoryInterface } from "@calcom/features/routing-forms/repositories/RoutingFormResponseRepository.interface";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingAuditErrorCode } from "../../BookingAuditResult";
import type { DisplayBookingAuditLog } from "../BookingAuditViewerService";
import { BookingHistoryViewerService } from "../BookingHistoryViewerService";

vi.mock("@calcom/features/routing-forms/lib/getFieldResponseByIdentifier", () => ({
  getFieldResponseByIdentifier: vi.fn(),
}));

import { getFieldResponseByIdentifier } from "@calcom/features/routing-forms/lib/getFieldResponseByIdentifier";

const mockGetFieldResponseByIdentifier = vi.mocked(getFieldResponseByIdentifier);

const NOW = new Date("2025-01-15T10:00:00Z");
const EARLIER = new Date("2025-01-15T08:00:00Z");
const LATEST = new Date("2025-01-15T12:00:00Z");

const BOOKING_UID = "booking-uid-123";
const USER_ID = 1;
const USER_EMAIL = "user@example.com";
const USER_TIMEZONE = "America/New_York";
const ORG_ID = 100;

function createMockAuditLog(overrides: Partial<DisplayBookingAuditLog> = {}): DisplayBookingAuditLog {
  return {
    id: overrides.id ?? "log-1",
    bookingUid: overrides.bookingUid ?? BOOKING_UID,
    type: overrides.type ?? "RECORD_CREATED",
    action: overrides.action ?? "CREATED",
    timestamp: overrides.timestamp ?? NOW.toISOString(),
    createdAt: overrides.createdAt ?? NOW.toISOString(),
    source: overrides.source ?? "WEBAPP",
    operationId: overrides.operationId ?? "op-1",
    displayJson: overrides.displayJson ?? null,
    actionDisplayTitle: overrides.actionDisplayTitle ?? { key: "booking_created" },
    displayFields: overrides.displayFields ?? null,
    actor: overrides.actor ?? {
      id: "actor-1",
      type: "USER",
      userUuid: "user-uuid-1",
      attendeeId: null,
      name: "Test User",
      createdAt: NOW,
      displayName: "Test User",
      displayEmail: "test@example.com",
      displayAvatar: null,
    },
  };
}

function createMockFormResponse(overrides?: {
  id?: number;
  bookingUid?: string;
  email?: string;
  createdAt?: Date;
  formFields?: unknown;
}) {
  const id = overrides?.id ?? 1;
  return {
    id,
    uuid: `form-uuid-${id}`,
    formFillerId: `filler-${id}`,
    formId: "form-1",
    response: {
      "field-email": { value: overrides?.email ?? "guest@example.com", label: "Email" },
    },
    createdAt: overrides?.createdAt ?? NOW,
    updatedAt: null,
    routedToBookingUid: overrides?.bookingUid ?? BOOKING_UID,
    chosenRouteId: null,
    form: {
      fields: overrides?.formFields ?? [
        { id: "field-email", identifier: "email", type: "email", label: "Email" },
      ],
    },
  };
}

type MockBookingAuditViewerService = {
  getAuditLogsForBooking: ReturnType<typeof vi.fn>;
};

type MockRoutingFormResponseRepository = {
  [K in keyof RoutingFormResponseRepositoryInterface]: ReturnType<typeof vi.fn>;
};

function createDeps() {
  const bookingAuditViewerService: MockBookingAuditViewerService = {
    getAuditLogsForBooking: vi.fn(),
  };

  const routingFormResponseRepository: MockRoutingFormResponseRepository = {
    findByIdIncludeForm: vi.fn(),
    findByBookingUidIncludeForm: vi.fn(),
  };

  return {
    bookingAuditViewerService,
    routingFormResponseRepository,
  };
}

function createService(deps: ReturnType<typeof createDeps>) {
  return new BookingHistoryViewerService({
    bookingAuditViewerService: deps.bookingAuditViewerService as any,
    routingFormResponseRepository: deps.routingFormResponseRepository as any,
  });
}

const defaultParams = {
  bookingUid: BOOKING_UID,
  userId: USER_ID,
  userEmail: USER_EMAIL,
  userTimeZone: USER_TIMEZONE,
  organizationId: ORG_ID,
};

describe("BookingHistoryViewerService", () => {
  let deps: ReturnType<typeof createDeps>;
  let service: BookingHistoryViewerService;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createDeps();
    service = createService(deps);

    mockGetFieldResponseByIdentifier.mockReturnValue({
      success: true,
      data: "guest@example.com",
    });
  });

  describe("getHistoryForBooking", () => {
    describe("when audit viewer service returns failure", () => {
      it("propagates the error code from the audit viewer service", async () => {
        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: false,
          code: BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_NO_ACCESS,
        });

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result).toEqual({
          success: false,
          code: BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_NO_ACCESS,
        });
      });

      it("does not query for form responses on access failure", async () => {
        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: false,
          code: BookingAuditErrorCode.NO_ORGANIZATION_CONTEXT,
        });

        await service.getHistoryForBooking(defaultParams);

        expect(deps.routingFormResponseRepository.findByBookingUidIncludeForm).not.toHaveBeenCalled();
      });

      it.each([
        BookingAuditErrorCode.NO_ORGANIZATION_CONTEXT,
        BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_NO_ACCESS,
        BookingAuditErrorCode.BOOKING_HAS_NO_OWNER,
        BookingAuditErrorCode.BOOKING_OWNER_NOT_IN_ORGANIZATION,
        BookingAuditErrorCode.TEAM_EVENT_TYPE_NOT_IN_ORGANIZATION,
        BookingAuditErrorCode.ORG_MEMBER_PERMISSION_DENIED,
      ])("propagates error code: %s", async (errorCode) => {
        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: false,
          code: errorCode,
        });

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result).toEqual({ success: false, code: errorCode });
      });
    });

    describe("when audit viewer service returns success", () => {
      it("returns combined audit and form logs sorted reverse-chronologically", async () => {
        const auditLog = createMockAuditLog({
          id: "audit-1",
          timestamp: EARLIER.toISOString(),
          createdAt: EARLIER.toISOString(),
        });

        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: true,
          data: { bookingUid: BOOKING_UID, auditLogs: [auditLog] },
        });

        const formResponse = createMockFormResponse({ createdAt: LATEST });
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(formResponse);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.bookingUid).toBe(BOOKING_UID);
        expect(result.data.auditLogs).toHaveLength(2);
        // Latest first (form submission at 12:00), then audit log at 08:00
        expect(result.data.auditLogs[0].id).toBe("form-submission-1");
        expect(result.data.auditLogs[1].id).toBe("audit-1");
      });

      it("returns only audit logs when no form response exists", async () => {
        const auditLog = createMockAuditLog({ id: "audit-1" });

        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: true,
          data: { bookingUid: BOOKING_UID, auditLogs: [auditLog] },
        });

        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(null);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.auditLogs).toHaveLength(1);
        expect(result.data.auditLogs[0].id).toBe("audit-1");
      });

      it("returns only form log when audit logs are empty", async () => {
        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: true,
          data: { bookingUid: BOOKING_UID, auditLogs: [] },
        });

        const formResponse = createMockFormResponse({ createdAt: NOW });
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(formResponse);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.auditLogs).toHaveLength(1);
        expect(result.data.auditLogs[0].id).toBe("form-submission-1");
      });

      it("returns empty logs when both audit logs and form response are empty/null", async () => {
        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: true,
          data: { bookingUid: BOOKING_UID, auditLogs: [] },
        });

        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(null);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.auditLogs).toHaveLength(0);
      });

      it("passes correct bookingUid to routingFormResponseRepository", async () => {
        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: true,
          data: { bookingUid: BOOKING_UID, auditLogs: [] },
        });

        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(null);

        await service.getHistoryForBooking(defaultParams);

        expect(deps.routingFormResponseRepository.findByBookingUidIncludeForm).toHaveBeenCalledWith(
          BOOKING_UID
        );
      });

      it("passes correct params to bookingAuditViewerService", async () => {
        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: true,
          data: { bookingUid: BOOKING_UID, auditLogs: [] },
        });

        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(null);

        await service.getHistoryForBooking(defaultParams);

        expect(deps.bookingAuditViewerService.getAuditLogsForBooking).toHaveBeenCalledWith(defaultParams);
      });
    });

    describe("form submission entry creation", () => {
      beforeEach(() => {
        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: true,
          data: { bookingUid: BOOKING_UID, auditLogs: [] },
        });
      });

      it("creates a form submission entry with correct structure", async () => {
        const formResponse = createMockFormResponse({ id: 42, createdAt: NOW });
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(formResponse);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        const formEntry = result.data.auditLogs[0];
        expect(formEntry).toMatchObject({
          id: "form-submission-42",
          bookingUid: BOOKING_UID,
          type: "RECORD_CREATED",
          action: "CREATED",
          timestamp: NOW.toISOString(),
          createdAt: NOW.toISOString(),
          source: "WEBAPP",
          operationId: "form-submission-42",
          displayJson: null,
          actionDisplayTitle: { key: "form_submitted" },
          displayFields: null,
        });
      });

      it("creates actor with GUEST type and submitter email as displayName", async () => {
        mockGetFieldResponseByIdentifier.mockReturnValue({
          success: true,
          data: "submitter@example.com",
        });

        const formResponse = createMockFormResponse({ id: 7, createdAt: NOW });
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(formResponse);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        const actor = result.data.auditLogs[0].actor;
        expect(actor).toMatchObject({
          id: "form-submission-actor-7",
          type: "GUEST",
          userUuid: null,
          attendeeId: null,
          name: null,
          displayName: "submitter@example.com",
          displayEmail: "submitter@example.com",
          displayAvatar: null,
        });
      });

      it("uses 'Guest' as displayName when email field is not found", async () => {
        mockGetFieldResponseByIdentifier.mockReturnValue({
          success: false,
          error: "Field with identifier email not found",
        });

        const formResponse = createMockFormResponse({ createdAt: NOW });
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(formResponse);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.auditLogs[0].actor.displayName).toBe("Guest");
        expect(result.data.auditLogs[0].actor.displayEmail).toBeNull();
      });

      it("uses 'Guest' as displayName when email field value is not a string (array)", async () => {
        mockGetFieldResponseByIdentifier.mockReturnValue({
          success: true,
          data: ["email1@example.com", "email2@example.com"],
        });

        const formResponse = createMockFormResponse({ createdAt: NOW });
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(formResponse);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.auditLogs[0].actor.displayName).toBe("Guest");
        expect(result.data.auditLogs[0].actor.displayEmail).toBeNull();
      });

      it("uses 'Guest' as displayName when email field value is a number", async () => {
        mockGetFieldResponseByIdentifier.mockReturnValue({
          success: true,
          data: 12345,
        });

        const formResponse = createMockFormResponse({ createdAt: NOW });
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(formResponse);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.auditLogs[0].actor.displayName).toBe("Guest");
      });

      it("passes form response and fields to getFieldResponseByIdentifier", async () => {
        const formFields = [
          { id: "field-1", identifier: "email", type: "email", label: "Your Email" },
          { id: "field-2", identifier: "name", type: "text", label: "Name" },
        ];
        const formResponse = createMockFormResponse({ formFields });
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(formResponse);

        await service.getHistoryForBooking(defaultParams);

        expect(mockGetFieldResponseByIdentifier).toHaveBeenCalledWith({
          responsePayload: formResponse.response,
          formFields,
          identifier: "email",
        });
      });
    });

    describe("sorting", () => {
      beforeEach(() => {
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(null);
      });

      it("sorts multiple audit logs in reverse chronological order", async () => {
        const log1 = createMockAuditLog({ id: "oldest", timestamp: EARLIER.toISOString() });
        const log2 = createMockAuditLog({ id: "middle", timestamp: NOW.toISOString() });
        const log3 = createMockAuditLog({ id: "newest", timestamp: LATEST.toISOString() });

        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: true,
          data: { bookingUid: BOOKING_UID, auditLogs: [log1, log3, log2] },
        });

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.auditLogs.map((l) => l.id)).toEqual(["newest", "middle", "oldest"]);
      });

      it("interleaves form and audit logs by timestamp", async () => {
        const auditLogEarly = createMockAuditLog({
          id: "audit-early",
          timestamp: EARLIER.toISOString(),
        });
        const auditLogLate = createMockAuditLog({
          id: "audit-late",
          timestamp: LATEST.toISOString(),
        });

        deps.bookingAuditViewerService.getAuditLogsForBooking.mockResolvedValue({
          success: true,
          data: { bookingUid: BOOKING_UID, auditLogs: [auditLogEarly, auditLogLate] },
        });

        // Form submission at NOW (between EARLIER and LATEST)
        const formResponse = createMockFormResponse({ createdAt: NOW });
        deps.routingFormResponseRepository.findByBookingUidIncludeForm.mockResolvedValue(formResponse);

        const result = await service.getHistoryForBooking(defaultParams);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.auditLogs.map((l) => l.id)).toEqual([
          "audit-late",
          "form-submission-1",
          "audit-early",
        ]);
      });
    });
  });
});

import { randomUUID } from "node:crypto";

import dayjs from "@calcom/dayjs";
import type { ColumnFilter } from "@calcom/features/data-table/lib/types";
import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { getInsightsRoutingService } from "@calcom/features/di/containers/InsightsRouting";
import { objectToCsv } from "@calcom/features/insights/lib/objectToCsv";
import { getDateRanges, getTimeView } from "@calcom/features/insights/server/insightsDateUtils";
import prisma from "@calcom/prisma";
import type { Team, User, Membership, Booking } from "@calcom/prisma/client";
import type { App_RoutingForms_Form, App_RoutingForms_FormResponse } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const timestamp = Date.now();
const suffix = randomUUID().slice(0, 8);

/**
 * Creates an InsightsRoutingService instance the same way the handler does.
 */
function createRoutingService(
  user: { id: number; organizationId: number | null },
  input: {
    scope: "user" | "team" | "org";
    selectedTeamId?: number;
    startDate: string;
    endDate: string;
    columnFilters?: ColumnFilter[];
  }
) {
  return getInsightsRoutingService({
    options: {
      scope: input.scope,
      teamId: input.selectedTeamId,
      userId: user.id,
      orgId: user.organizationId,
    },
    filters: {
      startDate: input.startDate,
      endDate: input.endDate,
      columnFilters: input.columnFilters,
    },
  });
}

// Test data holders
let orgOwner: User;
let org: Team;
let team: Team;
let orgOwnerOrgMembership: Membership;
let orgOwnerTeamMembership: Membership;
let routingForm: App_RoutingForms_Form;
let formResponse: App_RoutingForms_FormResponse;
let booking: Booking;

const fieldId1 = `text-field-${randomUUID().slice(0, 8)}`;
const fieldId2 = `email-field-${randomUUID().slice(0, 8)}`;

const startDate = dayjs().subtract(7, "day").startOf("day").toISOString();
const endDate = dayjs().endOf("day").toISOString();

describe("Routing handler integration tests", () => {
  beforeAll(async () => {
    // Create org
    org = await prisma.team.create({
      data: {
        name: `RH Org ${timestamp}-${suffix}`,
        slug: `rh-org-${timestamp}-${suffix}`,
        isOrganization: true,
      },
    });

    // Create team under org
    team = await prisma.team.create({
      data: {
        name: `RH Team ${timestamp}-${suffix}`,
        slug: `rh-team-${timestamp}-${suffix}`,
        parentId: org.id,
      },
    });

    // Create org owner
    orgOwner = await prisma.user.create({
      data: {
        email: `rh-orgowner-${timestamp}-${suffix}@example.com`,
        username: `rh-orgowner-${timestamp}-${suffix}`,
        name: "RH Org Owner",
        organizationId: org.id,
      },
    });

    // Memberships
    orgOwnerOrgMembership = await prisma.membership.create({
      data: {
        userId: orgOwner.id,
        teamId: org.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    orgOwnerTeamMembership = await prisma.membership.create({
      data: {
        userId: orgOwner.id,
        teamId: team.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    // Create routing form
    routingForm = await prisma.app_RoutingForms_Form.create({
      data: {
        name: `RH Routing Form ${timestamp}-${suffix}`,
        userId: orgOwner.id,
        teamId: team.id,
        fields: [
          {
            id: fieldId1,
            type: "text",
            label: "Full Name",
            required: true,
          },
          {
            id: fieldId2,
            type: "email",
            label: "Email Address",
            required: true,
          },
        ],
      },
    });

    // Create a booking for the form response to reference
    booking = await prisma.booking.create({
      data: {
        uid: `rh-booking-${timestamp}-${suffix}`,
        title: "RH Test Booking",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().subtract(2, "day").toDate(),
        endTime: dayjs().subtract(2, "day").add(30, "minute").toDate(),
        userId: orgOwner.id,
      },
    });

    // Create form response
    formResponse = await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: `rh-filler-${timestamp}-${suffix}`,
        formId: routingForm.id,
        response: {
          [fieldId1]: {
            label: "Full Name",
            value: "Test User",
          },
          [fieldId2]: {
            label: "Email Address",
            value: "testuser@example.com",
          },
        },
        routedToBookingUid: booking.uid,
      },
    });
  });

  afterAll(async () => {
    try {
      if (formResponse?.id) {
        await prisma.app_RoutingForms_FormResponse.deleteMany({ where: { id: formResponse.id } });
      }
      if (booking?.id) {
        await prisma.booking.deleteMany({ where: { id: booking.id } });
      }
      if (routingForm?.id) {
        await prisma.app_RoutingForms_Form.deleteMany({ where: { id: routingForm.id } });
      }
      const membershipIds = [orgOwnerOrgMembership?.id, orgOwnerTeamMembership?.id].filter(Boolean);
      if (membershipIds.length > 0) {
        await prisma.membership.deleteMany({ where: { id: { in: membershipIds } } });
      }
      if (orgOwner?.id) {
        await prisma.user.deleteMany({ where: { id: orgOwner.id } });
      }
      if (team?.id) {
        await prisma.team.deleteMany({ where: { id: team.id } });
      }
      if (org?.id) {
        await prisma.team.deleteMany({ where: { id: org.id } });
      }
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  });

  describe("routingFormsByStatus", () => {
    it("should return routing form stats for team scope", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const result = await service.getRoutingFormStats();
      expect(result).toBeDefined();
    });
  });

  describe("routingFormResponses", () => {
    it("should return paginated table data", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const result = await service.getTableData({
        sorting: undefined,
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should respect limit and offset parameters", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const result = await service.getTableData({
        sorting: undefined,
        limit: 1,
        offset: 0,
      });

      expect(result.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe("failedBookingsByField", () => {
    it("should return failed bookings by field data", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const result = await service.getFailedBookingsByFieldData();
      expect(result).toBeDefined();
    });
  });

  describe("routedToPerPeriod", () => {
    it("should return routed-to data per day", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const result = await service.getRoutedToPerPeriodData({
        period: "perDay",
        limit: 10,
      });

      expect(result).toBeDefined();
    });

    it("should return routed-to data per week", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const result = await service.getRoutedToPerPeriodData({
        period: "perWeek",
        limit: 10,
      });

      expect(result).toBeDefined();
    });

    it("should return routed-to data per month", async () => {
      const wideStartDate = dayjs().subtract(3, "month").startOf("day").toISOString();
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate: wideStartDate, endDate }
      );

      const result = await service.getRoutedToPerPeriodData({
        period: "perMonth",
        limit: 10,
      });

      expect(result).toBeDefined();
    });

    it("should support search query filtering", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const result = await service.getRoutedToPerPeriodData({
        period: "perDay",
        limit: 10,
        searchQuery: "nonexistent-search-query",
      });

      expect(result).toBeDefined();
    });
  });

  describe("routedToPerPeriodCsv", () => {
    it("should return CSV data for routed-to per period", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const csvData = await service.getRoutedToPerPeriodCsvData({
        period: "perDay",
      });

      expect(Array.isArray(csvData)).toBe(true);

      // Verify CSV conversion works
      const csvString = objectToCsv(csvData);
      expect(typeof csvString).toBe("string");
    });

    it("should generate proper filename format", () => {
      const downloadAs = `routed-to-perDay-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format("YYYY-MM-DD")}.csv`;
      expect(downloadAs).toMatch(/^routed-to-perDay-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });

  describe("getRoutingFunnelData", () => {
    it("should return routing funnel data with date ranges", async () => {
      const timeView = getTimeView(startDate, endDate);
      const dateRanges = getDateRanges({
        startDate,
        endDate,
        timeZone: "UTC",
        timeView,
        weekStart: "Sunday",
      });

      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const result = await service.getRoutingFunnelData(dateRanges);
      expect(result).toBeDefined();
    });
  });

  describe("scope-based access", () => {
    it("should support team scope", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate }
      );

      const result = await service.getRoutingFormStats();
      expect(result).toBeDefined();
    });

    it("should support org scope", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "org", startDate, endDate }
      );

      const result = await service.getRoutingFormStats();
      expect(result).toBeDefined();
    });

    it("should support user scope", async () => {
      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "user", startDate, endDate }
      );

      const result = await service.getRoutingFormStats();
      expect(result).toBeDefined();
    });
  });

  describe("column filter support", () => {
    it("should support filtering by routingFormId", async () => {
      const columnFilters: ColumnFilter[] = [
        {
          id: "formId",
          value: {
            type: ColumnFilterType.SINGLE_SELECT,
            data: routingForm.id,
          },
        },
      ];

      const service = createRoutingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, startDate, endDate, columnFilters }
      );

      const result = await service.getRoutingFormStats();
      expect(result).toBeDefined();
    });
  });
});

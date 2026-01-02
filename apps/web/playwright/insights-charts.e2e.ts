import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import { BookingStatus } from "@calcom/prisma/enums";

import { expectAllChartsToLoad, getAllChartIds } from "./lib/chart-helpers";
import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Insights > Charts Loading", () => {
  test.describe("Routing Insights", () => {
    test("all charts should load successfully with data", async ({ page, users, routingForms, prisma }) => {
      // Setup: Create routing form with complete data
      const owner = await users.create(
        { name: "Chart Test Owner" },
        {
          hasTeam: true,
          isUnpublished: true,
          isOrg: true,
          hasSubteam: true,
        }
      );
      await owner.apiLogin();

      const membership = await owner.getFirstTeamMembership();

      // Create a routing form with fields
      const formName = "Chart Loading Test Form";
      const form = await routingForms.create({
        name: formName,
        userId: owner.id,
        teamId: membership.teamId,
        fields: [
          {
            type: "text",
            label: "Name",
            identifier: "name",
            required: true,
          },
          {
            type: "email",
            label: "Email",
            identifier: "email",
            required: true,
          },
          {
            type: "select",
            label: "Department",
            identifier: "department",
            required: true,
            options: [
              {
                id: uuidv4(),
                label: "Sales",
              },
              {
                id: uuidv4(),
                label: "Support",
              },
            ],
          },
        ],
      });

      const fieldIds = (form.fields as Array<{ id: string }>).map((f) => f.id);

      // Create users for routing
      const user1 = await users.create({ name: "Sales User" });
      const user2 = await users.create({ name: "Support User" });

      // Add users to the team
      await prisma.membership.createMany({
        data: [
          {
            teamId: membership.teamId,
            userId: user1.id,
            role: "MEMBER",
            accepted: true,
          },
          {
            teamId: membership.teamId,
            userId: user2.id,
            role: "MEMBER",
            accepted: true,
          },
        ],
      });

      // Create bookings for both users
      const booking1 = await prisma.booking.create({
        data: {
          uid: `booking-${uuidv4()}`,
          title: "Sales Booking",
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          userId: user1.id,
          status: BookingStatus.ACCEPTED,
        },
      });

      const booking2 = await prisma.booking.create({
        data: {
          uid: `booking-${uuidv4()}`,
          title: "Support Booking",
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          userId: user2.id,
          status: BookingStatus.ACCEPTED,
        },
      });

      // Create form responses with bookings
      await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "filler-1",
          formId: form.id,
          response: {
            [fieldIds[0]]: { label: "Name", value: "John Doe" },
            [fieldIds[1]]: { label: "Email", value: "john@example.com" },
            [fieldIds[2]]: { label: "Department", value: "Sales" },
          },
          routedToBookingUid: booking1.uid,
        },
      });

      await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "filler-2",
          formId: form.id,
          response: {
            [fieldIds[0]]: { label: "Name", value: "Jane Smith" },
            [fieldIds[1]]: { label: "Email", value: "jane@example.com" },
            [fieldIds[2]]: { label: "Department", value: "Support" },
          },
          routedToBookingUid: booking2.uid,
        },
      });

      // Create a response without booking (for "Failed Bookings" chart)
      await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "filler-3",
          formId: form.id,
          response: {
            [fieldIds[0]]: { label: "Name", value: "Bob Wilson" },
            [fieldIds[1]]: { label: "Email", value: "bob@example.com" },
            [fieldIds[2]]: { label: "Department", value: "Sales" },
          },
          routedToBookingUid: null,
        },
      });

      // Navigate to insights routing page
      await page.goto("/insights/routing");
      await expect(page).toHaveURL(/\/insights\/routing/);

      // Wait for the page to be fully loaded
      await page.waitForLoadState("networkidle");

      // Get all chart IDs before checking
      const chartIds = await getAllChartIds(page);
      console.log(`[Routing] Found ${chartIds.length} charts: ${chartIds.join(", ")}`);

      // Assert all charts load successfully
      await expectAllChartsToLoad(page, 20000); // 20 second timeout for all charts

      // Verify specific expected charts are present and loaded
      const expectedCharts = ["stats", "routing-funnel", "routed-to-per-period", "failed-bookings-by-field"];

      for (const chartId of expectedCharts) {
        const chart = page.locator(`[data-testid="chart-card"][data-chart-id="${chartId}"]`);
        await expect(chart).toBeVisible();
        await expect(chart).toHaveAttribute("data-loading-state", "loaded");
      }

      // Cleanup
      await prisma.booking.delete({ where: { id: booking1.id } });
      await prisma.booking.delete({ where: { id: booking2.id } });
    });
  });

  test.describe("Bookings Insights", () => {
    test("all charts should load successfully with booking data", async ({
      page,
      users,
      bookings,
      prisma,
    }) => {
      // Setup: Create users with team membership
      const owner = await users.create({ name: "Chart Test Owner" });
      const member = await users.create({ name: "Chart Test Member" });

      // Create team and add both users
      const team = await prisma.team.create({
        data: {
          name: "test-insights-bookings",
          slug: `test-insights-bookings-${Date.now()}`,
        },
      });

      await prisma.membership.createMany({
        data: [
          {
            userId: owner.id,
            teamId: team.id,
            accepted: true,
            role: "ADMIN",
          },
          {
            userId: member.id,
            teamId: team.id,
            accepted: true,
            role: "MEMBER",
          },
        ],
      });

      await owner.apiLogin();

      // Create some bookings for the user
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const threeDaysFromNow = new Date(dayAfterTomorrow);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 1);

      // Create bookings at different times to ensure unique idempotency keys
      await bookings.create(owner.id, owner.username, owner.eventTypes[0].id, {
        status: BookingStatus.ACCEPTED,
        startTime: now,
        endTime: tomorrow,
      });

      await bookings.create(owner.id, owner.username, owner.eventTypes[0].id, {
        status: BookingStatus.ACCEPTED,
        startTime: tomorrow,
        endTime: dayAfterTomorrow,
      });

      await bookings.create(owner.id, owner.username, owner.eventTypes[0].id, {
        status: BookingStatus.CANCELLED,
        startTime: dayAfterTomorrow,
        endTime: threeDaysFromNow,
      });

      // Navigate to insights bookings page
      await page.goto("/insights");
      await expect(page).toHaveURL(/\/insights/);

      // Wait for the page to be fully loaded
      await page.waitForLoadState("networkidle");

      // Get all chart IDs before checking
      const chartIds = await getAllChartIds(page);
      console.log(`[Bookings] Found ${chartIds.length} charts: ${chartIds.join(", ")}`);

      // Assert all charts load successfully
      await expectAllChartsToLoad(page, 20000); // 20 second timeout for all charts

      // Verify specific expected charts are present and loaded
      const expectedCharts = [
        "events",
        "performance",
        "event-trends",
        "no-show-hosts-over-time",
        "csat-over-time",
        "bookings-by-hour",
        "average-event-duration",
      ];

      for (const chartId of expectedCharts) {
        const chart = page.locator(`[data-testid="chart-card"][data-chart-id="${chartId}"]`);
        // Chart should exist and be loaded
        await expect(chart).toHaveCount(1);
        await expect(chart).toHaveAttribute("data-loading-state", "loaded");
      }

      // Verify no charts are in error state
      const errorCharts = page.locator('[data-testid="chart-card"][data-loading-state="error"]');
      await expect(errorCharts).toHaveCount(0, { timeout: 0 });
    });
  });
});

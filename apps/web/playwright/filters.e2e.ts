import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";

import { selectFilter, applyFilter, clearFilters } from "./filter-helpers";
import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe.configure({ mode: "parallel" });

test.describe("Insights > Routing Filters", () => {
  test("formId filter: should filter by selected routing form", async ({
    page,
    users,
    routingForms,
    prisma,
  }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    try {
      await owner.apiLogin();
      await expect(page.locator('[data-testid="insights-tabs"]')).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }

    const membership = await owner.getOrgMembership();

    const formName1 = "Test Form 1";
    const form1 = await routingForms.create({
      name: formName1,
      userId: owner.id,
      teamId: membership.teamId,
      fields: [
        {
          type: "text",
          label: "Name",
          identifier: "name",
          required: true,
        },
      ],
    });

    const formName2 = "Test Form 2";
    const form2 = await routingForms.create({
      name: formName2,
      userId: owner.id,
      teamId: membership.teamId,
      fields: [
        {
          type: "text",
          label: "Email",
          identifier: "email",
          required: true,
        },
      ],
    });

    await page.goto(`/insights/routing`);

    await applyFilter(page, "formId", formName1);

    await expect(page.getByText(formName1)).toBeVisible({ timeout: 10000 });

    await clearFilters(page);
    await applyFilter(page, "formId", formName2);

    await expect(page.getByText(formName2)).toBeVisible({ timeout: 10000 });
  });

  test("bookingUserId filter: should filter by user", async ({ page, users, routingForms, prisma }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    const user1 = await users.create({ name: "User One" });
    const user2 = await users.create({ name: "User Two" });

    try {
      await owner.apiLogin();
      await expect(page.locator('[data-testid="insights-tabs"]')).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
    const membership = await owner.getOrgMembership();

    const formName = "Filter User Test Form";
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
      ],
    });

    const booking1 = await prisma.booking.create({
      data: {
        uid: `booking-${uuidv4()}`,
        title: "Test Booking 1",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: user1.id,
        status: BookingStatus.ACCEPTED,
      },
    });

    const booking2 = await prisma.booking.create({
      data: {
        uid: `booking-${uuidv4()}`,
        title: "Test Booking 2",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: user2.id,
        status: BookingStatus.ACCEPTED,
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-1",
        formId: form.id,
        response: {
          name: {
            label: "Name",
            value: "John Doe",
          },
        },
        routedToBookingUid: booking1.uid,
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-2",
        formId: form.id,
        response: {
          name: {
            label: "Name",
            value: "Jane Smith",
          },
        },
        routedToBookingUid: booking2.uid,
      },
    });

    await page.goto(`/insights/routing`);

    await applyFilter(page, "bookingUserId", user1.name || "User One");

    await expect(page.getByText("John Doe")).toBeVisible();
    await expect(page.getByText("Jane Smith")).toBeHidden();

    await prisma.booking.delete({ where: { id: booking1.id } });
    await prisma.booking.delete({ where: { id: booking2.id } });
  });

  test("bookingAttendees filter: should filter by attendee name or email", async ({
    page,
    users,
    routingForms,
    prisma,
  }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    try {
      await owner.apiLogin();
      await expect(page.locator('[data-testid="insights-tabs"]')).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
    const membership = await owner.getOrgMembership();

    const formName = "Attendee Filter Test Form";
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
      ],
    });

    const booking1 = await prisma.booking.create({
      data: {
        uid: `booking-${uuidv4()}`,
        title: "Test Booking 1",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: owner.id,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: [
            {
              email: "john.doe@example.com",
              name: "John Doe",
              timeZone: "UTC",
            },
          ],
        },
      },
    });

    const booking2 = await prisma.booking.create({
      data: {
        uid: `booking-${uuidv4()}`,
        title: "Test Booking 2",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: owner.id,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: [
            {
              email: "jane.smith@example.com",
              name: "Jane Smith",
              timeZone: "UTC",
            },
          ],
        },
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-1",
        formId: form.id,
        response: { name: { label: "Name", value: "Response 1" } },
        routedToBookingUid: booking1.uid,
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-2",
        formId: form.id,
        response: { name: { label: "Name", value: "Response 2" } },
        routedToBookingUid: booking2.uid,
      },
    });

    await page.goto(`/insights/routing`);

    await selectFilter(page, "bookingAttendees");
    await page.getByTestId("filter-popover-trigger-bookingAttendees").click();
    await page.getByPlaceholder("Filter attendees by name or email").fill("John");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Response 1")).toBeVisible();
    await expect(page.getByText("Response 2")).toBeHidden();

    await prisma.booking.delete({ where: { id: booking1.id } });
    await prisma.booking.delete({ where: { id: booking2.id } });
  });

  test("TEXT field: should filter with different text operators", async ({
    page,
    users,
    routingForms,
    prisma,
  }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    try {
      await owner.apiLogin();
      await expect(page.locator('[data-testid="insights-tabs"]')).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
    const membership = await owner.getOrgMembership();

    const textFieldId = uuidv4();
    const formName = "Text Filter Test Form";
    const form = await routingForms.create({
      name: formName,
      userId: owner.id,
      teamId: membership.teamId,
      fields: [
        {
          type: "text",
          label: "Description",
          identifier: "description",
          required: true,
        },
      ],
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-1",
        formId: form.id,
        response: {
          description: {
            label: "Description",
            value: "This is a test description",
          },
        },
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-2",
        formId: form.id,
        response: {
          description: {
            label: "Description",
            value: "Another description for testing",
          },
        },
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-3",
        formId: form.id,
        response: {
          description: {
            label: "Description",
            value: "",
          },
        },
      },
    });

    await page.goto(`/insights/routing`);

    await selectFilter(page, "description");
    await page.getByTestId("filter-popover-trigger-description").click();
    await page
      .getByTestId("select-filter-options-description")
      .getByRole("option", { name: "contains" })
      .click();
    await page.getByPlaceholder("Filter value").fill("test");
    await page.keyboard.press("Enter");

    await expect(page.getByText("This is a test description")).toBeVisible();
    await expect(page.getByText("Another description for testing")).toBeVisible();

    await clearFilters(page);
    await selectFilter(page, "description");
    await page.getByTestId("filter-popover-trigger-description").click();
    await page
      .getByTestId("select-filter-options-description")
      .getByRole("option", { name: "equals" })
      .click();
    await page.getByPlaceholder("Filter value").fill("This is a test description");
    await page.keyboard.press("Enter");

    await expect(page.getByText("This is a test description")).toBeVisible();
    await expect(page.getByText("Another description for testing")).toBeHidden();

    await clearFilters(page);
    await selectFilter(page, "description");
    await page.getByTestId("filter-popover-trigger-description").click();
    await page
      .getByTestId("select-filter-options-description")
      .getByRole("option", { name: "isEmpty" })
      .click();
    await page.keyboard.press("Enter");

    await expect(page.getByText("This is a test description")).toBeHidden();
    await expect(page.getByText("Another description for testing")).toBeHidden();
  });

  test("NUMBER field: should filter with different number operators", async ({
    page,
    users,
    routingForms,
    prisma,
  }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    try {
      await owner.apiLogin();
      await expect(page.locator('[data-testid="insights-tabs"]')).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
    const membership = await owner.getOrgMembership();

    const numberFieldId = uuidv4();
    const formName = "Number Filter Test Form";
    const form = await routingForms.create({
      name: formName,
      userId: owner.id,
      teamId: membership.teamId,
      fields: [
        {
          type: "number",
          label: "Rating",
          identifier: "rating",
          required: true,
        },
      ],
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-1",
        formId: form.id,
        response: {
          rating: {
            label: "Rating",
            value: 1,
          },
        },
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-2",
        formId: form.id,
        response: {
          rating: {
            label: "Rating",
            value: 3,
          },
        },
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-3",
        formId: form.id,
        response: {
          rating: {
            label: "Rating",
            value: 5,
          },
        },
      },
    });

    await page.goto(`/insights/routing`);

    await selectFilter(page, "rating");
    await page.getByTestId("filter-popover-trigger-rating").click();
    await page.getByTestId("select-filter-options-rating").getByRole("option", { name: "equals" }).click();
    await page.getByPlaceholder("Filter value").fill("3");
    await page.keyboard.press("Enter");

    await expect(page.getByText("3")).toBeVisible();
    await expect(page.getByText("1")).toBeHidden();
    await expect(page.getByText("5")).toBeHidden();

    await clearFilters(page);
    await selectFilter(page, "rating");
    await page.getByTestId("filter-popover-trigger-rating").click();
    await page
      .getByTestId("select-filter-options-rating")
      .getByRole("option", { name: "greater than" })
      .click();
    await page.getByPlaceholder("Filter value").fill("3");
    await page.keyboard.press("Enter");

    await expect(page.getByText("5")).toBeVisible();
    await expect(page.getByText("1")).toBeHidden();
    await expect(page.getByText("3")).toBeHidden();

    await clearFilters(page);
    await selectFilter(page, "rating");
    await page.getByTestId("filter-popover-trigger-rating").click();
    await page
      .getByTestId("select-filter-options-rating")
      .getByRole("option", { name: "less than or equal" })
      .click();
    await page.getByPlaceholder("Filter value").fill("3");
    await page.keyboard.press("Enter");

    await expect(page.getByText("1")).toBeVisible();
    await expect(page.getByText("3")).toBeVisible();
    await expect(page.getByText("5")).toBeHidden();
  });

  test("SINGLE_SELECT and MULTI_SELECT fields: should filter correctly", async ({
    page,
    users,
    routingForms,
    prisma,
  }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    try {
      await owner.apiLogin();
      await expect(page.locator('[data-testid="insights-tabs"]')).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
    const membership = await owner.getOrgMembership();

    const singleSelectFieldId = uuidv4();
    const multiSelectFieldId = uuidv4();
    const formName = "Select Filter Test Form";

    const locationOptionId1 = uuidv4();
    const locationOptionId2 = uuidv4();

    const skillOptionId1 = uuidv4();
    const skillOptionId2 = uuidv4();
    const skillOptionId3 = uuidv4();

    const form = await routingForms.create({
      name: formName,
      userId: owner.id,
      teamId: membership.teamId,
      fields: [
        {
          type: "select",
          label: "Location",
          identifier: "location",
          required: true,
          options: [
            {
              id: locationOptionId1,
              label: "New York",
            },
            {
              id: locationOptionId2,
              label: "London",
            },
          ],
        },
        {
          type: "multiselect",
          label: "Skills",
          identifier: "skills",
          required: true,
          options: [
            {
              id: skillOptionId1,
              label: "JavaScript",
            },
            {
              id: skillOptionId2,
              label: "TypeScript",
            },
            {
              id: skillOptionId3,
              label: "React",
            },
          ],
        },
      ],
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-1",
        formId: form.id,
        response: {
          [singleSelectFieldId]: {
            label: "Location",
            value: locationOptionId1,
          },
          [multiSelectFieldId]: {
            label: "Skills",
            value: [skillOptionId1, skillOptionId2],
          },
        },
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-2",
        formId: form.id,
        response: {
          [singleSelectFieldId]: {
            label: "Location",
            value: locationOptionId2,
          },
          [multiSelectFieldId]: {
            label: "Skills",
            value: [skillOptionId2, skillOptionId3],
          },
        },
      },
    });

    await page.goto(`/insights/routing`);

    await selectFilter(page, "location");
    await page.getByTestId("filter-popover-trigger-location").click();
    await page
      .getByTestId("select-filter-options-location")
      .getByRole("option", { name: "New York" })
      .click();
    await page.keyboard.press("Escape");

    await expect(page.getByText("New York")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("London")).toBeHidden({ timeout: 10000 });

    await clearFilters(page);
    await selectFilter(page, "skills");
    await page.getByTestId("filter-popover-trigger-skills").click();
    await page.getByTestId("select-filter-options-skills").getByRole("option", { name: "React" }).click();
    await page.keyboard.press("Escape");

    await expect(page.getByText("React")).toBeVisible({ timeout: 10000 });
  });

  test("createdAt filter: should filter by date range", async ({ page, users, routingForms, prisma }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    try {
      await owner.apiLogin();
      await expect(page.locator('[data-testid="insights-tabs"]')).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
    const membership = await owner.getOrgMembership();

    const formName = "Date Range Filter Test Form";
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
      ],
    });

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-old",
        formId: form.id,
        response: {
          name: {
            label: "Name",
            value: "Old Response",
          },
        },
        createdAt: oldDate,
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-recent",
        formId: form.id,
        response: {
          name: {
            label: "Name",
            value: "Recent Response",
          },
        },
      },
    });

    await page.goto(`/insights/routing`);

    await selectFilter(page, "createdAt");
    await page.getByTestId("filter-popover-trigger-createdAt").click();
    await page.getByTestId("date-range-options-w").click(); // Last 7 Days

    await expect(page.getByText("Recent Response")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Old Response")).toBeHidden({ timeout: 10000 });

    await clearFilters(page);
    await selectFilter(page, "createdAt");
    await page.getByTestId("filter-popover-trigger-createdAt").click();
    await page.getByTestId("date-range-options-t").click(); // Last 30 Days

    await expect(page.getByText("Recent Response")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Old Response")).toBeVisible({ timeout: 10000 });

    await clearFilters(page);
    await selectFilter(page, "createdAt");
    await page.getByTestId("filter-popover-trigger-createdAt").click();
    await page.getByTestId("date-range-options-c").click(); // Custom

    const startDate = dayjs(oldDate).subtract(1, "day").format("YYYY-MM-DD");
    const endDate = dayjs(oldDate).add(1, "day").format("YYYY-MM-DD");

    await page.getByTestId("date-range-start-date").fill(startDate);
    await page.getByTestId("date-range-end-date").fill(endDate);
    await page.keyboard.press("Enter");

    await expect(page.getByText("Old Response")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Recent Response")).toBeHidden({ timeout: 10000 });
  });
});

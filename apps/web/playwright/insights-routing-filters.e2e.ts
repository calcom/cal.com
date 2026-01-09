import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import {
  addFilter,
  openFilter,
  clearFilters,
  applySelectFilter,
  applyTextFilter,
  applyNumberFilter,
  selectOptionValue,
  getByTableColumnText,
} from "./filter-helpers";
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
    await owner.apiLogin();

    const membership = await owner.getFirstTeamMembership();

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

    await openFilter(page, "formId");
    await selectOptionValue(page, "formId", formName1);
    await page.keyboard.press("Escape");

    await expect(page.getByText(formName1)).toBeVisible();
    await expect(page.getByText(formName2)).toBeHidden();

    await openFilter(page, "formId");
    await selectOptionValue(page, "formId", formName2);
    await page.keyboard.press("Escape");

    await expect(page.getByText(formName2)).toBeVisible();
    await expect(page.getByText(formName1)).toBeHidden();
  });

  test("bookingUserId filter: should filter by user", async ({ page, users, routingForms, prisma }) => {
    const owner = await users.create(
      { name: "owner" },
      {
        hasTeam: true,
        isUnpublished: true,
        isOrg: true,
        hasSubteam: true,
      }
    );
    const membership = await owner.getFirstTeamMembership();

    const user1Name = "User One";
    const user1 = await users.create({ name: user1Name });
    const user2 = await users.create({ name: "User Two" });
    await prisma.membership.createMany({
      data: [
        {
          teamId: membership.teamId,
          userId: user1.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
        {
          teamId: membership.teamId,
          userId: user2.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      ],
    });

    await owner.apiLogin();

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

    const fieldId = (form.fields as any)[0].id;
    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-1",
        formId: form.id,
        response: {
          [fieldId]: {
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
          [fieldId]: {
            label: "Name",
            value: "Jane Smith",
          },
        },
        routedToBookingUid: booking2.uid,
      },
    });

    await page.goto(`/insights/routing`);

    await applySelectFilter(page, "bookingUserId", user1Name);

    await expect(getByTableColumnText(page, fieldId, "John Doe")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "Jane Smith")).toBeHidden();

    await prisma.booking.delete({ where: { id: booking1.id } });
    await prisma.booking.delete({ where: { id: booking2.id } });
  });

  // We will add it back when we enable the bookingAttendees filter on /insights/routing
  test.skip("bookingAttendees filter: should filter by attendee name or email", async ({
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
    await owner.apiLogin();

    const membership = await owner.getFirstTeamMembership();

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
    const fieldId = (form.fields as any)[0].id;

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
        response: { [fieldId]: { label: "Name", value: "Response 1" } },
        routedToBookingUid: booking1.uid,
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-2",
        formId: form.id,
        response: { [fieldId]: { label: "Name", value: "Response 2" } },
        routedToBookingUid: booking2.uid,
      },
    });

    await page.goto(`/insights/routing`);

    await addFilter(page, "bookingAttendees");
    await page.getByPlaceholder("Filter attendees by name or email").fill("John");
    await page.keyboard.press("Enter");

    await expect(getByTableColumnText(page, fieldId, "Response 1")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "Response 2")).toBeHidden();

    await clearFilters(page);
    await addFilter(page, "bookingAttendees");
    await page.getByPlaceholder("Filter attendees by name or email").fill("jane.smith@example");
    await page.keyboard.press("Enter");

    await expect(getByTableColumnText(page, fieldId, "Response 2")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "Response 1")).toBeHidden();

    await clearFilters(page);
    await addFilter(page, "bookingAttendees");
    await page.getByPlaceholder("Filter attendees by name or email").fill("JANE");
    await page.keyboard.press("Enter");

    await expect(getByTableColumnText(page, fieldId, "Response 2")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "Response 1")).toBeHidden();

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
    await owner.apiLogin();

    const membership = await owner.getFirstTeamMembership();

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
    const fieldId = (form.fields as any)[0].id;

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-1",
        formId: form.id,
        response: {
          [fieldId]: {
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
          [fieldId]: {
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
          [fieldId]: {
            label: "Description",
            value: "",
          },
        },
      },
    });

    await page.goto(`/insights/routing`);

    await applyTextFilter(page, fieldId, "Contains", "test");

    await expect(getByTableColumnText(page, fieldId, "This is a test description")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "Another description for testing")).toBeVisible();

    await clearFilters(page);
    await applyTextFilter(page, fieldId, "Is", "This is a test description");

    await expect(getByTableColumnText(page, fieldId, "This is a test description")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "Another description for testing")).toBeHidden();

    await clearFilters(page);
    await applyTextFilter(page, fieldId, "Is empty");

    await expect(getByTableColumnText(page, fieldId, "This is a test description")).toBeHidden();
    await expect(getByTableColumnText(page, fieldId, "Another description for testing")).toBeHidden();

    await clearFilters(page);
    await applyTextFilter(page, fieldId, "Contains", "TEST");

    await expect(getByTableColumnText(page, fieldId, "This is a test description")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "Another description for testing")).toBeVisible();
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
    await owner.apiLogin();

    const membership = await owner.getFirstTeamMembership();

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
    const fieldId = (form.fields as any)[0].id;

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-1",
        formId: form.id,
        response: {
          [fieldId]: {
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
          [fieldId]: {
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
          [fieldId]: {
            label: "Rating",
            value: 5,
          },
        },
      },
    });

    await page.goto(`/insights/routing`);

    await applyNumberFilter(page, fieldId, "=", 3);

    await expect(getByTableColumnText(page, fieldId, "3")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "1")).toBeHidden();
    await expect(getByTableColumnText(page, fieldId, "5")).toBeHidden();

    await clearFilters(page);
    await applyNumberFilter(page, fieldId, ">", 3);

    await expect(getByTableColumnText(page, fieldId, "5")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "1")).toBeHidden();
    await expect(getByTableColumnText(page, fieldId, "3")).toBeHidden();

    await clearFilters(page);
    await applyNumberFilter(page, fieldId, "≤", 3);

    await expect(getByTableColumnText(page, fieldId, "1")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "3")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "5")).toBeHidden();
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
    await owner.apiLogin();

    const membership = await owner.getFirstTeamMembership();

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
    const locationFieldId = (form.fields as any)[0].id;
    const skillFieldId = (form.fields as any)[1].id;

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-1",
        formId: form.id,
        response: {
          [locationFieldId]: {
            label: "Location",
            value: locationOptionId1,
          },
          [skillFieldId]: {
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
          [locationFieldId]: {
            label: "Location",
            value: locationOptionId2,
          },
          [skillFieldId]: {
            label: "Skills",
            value: [skillOptionId2, skillOptionId3],
          },
        },
      },
    });

    await page.goto(`/insights/routing`);

    await applySelectFilter(page, locationFieldId, "New York");
    await expect(getByTableColumnText(page, locationFieldId, "New York")).toBeVisible();
    await expect(getByTableColumnText(page, locationFieldId, "London")).toBeHidden();

    await clearFilters(page);
    await applySelectFilter(page, skillFieldId, "JavaScript");
    await applySelectFilter(page, skillFieldId, "TypeScript");
    await expect(getByTableColumnText(page, skillFieldId, "JavaScript")).toBeVisible();
    await expect(getByTableColumnText(page, skillFieldId, "TypeScript")).toBeVisible();
    await expect(getByTableColumnText(page, skillFieldId, "React")).toBeHidden();
  });

  test("createdAt filter: should filter by date range", async ({ page, users, routingForms, prisma }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    await owner.apiLogin();

    const membership = await owner.getFirstTeamMembership();

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
    const fieldId = (form.fields as any)[0].id;

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler-old",
        formId: form.id,
        response: {
          [fieldId]: {
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
          [fieldId]: {
            label: "Name",
            value: "Recent Response",
          },
        },
      },
    });

    await page.goto(`/insights/routing`);

    await openFilter(page, "createdAt");
    await page.getByTestId("date-range-options-w").click(); // Last 7 Days
    await page.keyboard.press("Escape");

    await expect(getByTableColumnText(page, fieldId, "Recent Response")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "Old Response")).toBeHidden();

    await openFilter(page, "createdAt");
    await page.getByTestId("date-range-options-t").click(); // Last 30 Days
    await page.keyboard.press("Escape");

    await expect(getByTableColumnText(page, fieldId, "Recent Response")).toBeVisible();
    await expect(getByTableColumnText(page, fieldId, "Old Response")).toBeVisible();
  });
});

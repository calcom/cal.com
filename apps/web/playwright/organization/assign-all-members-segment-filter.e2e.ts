import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";
import { doOnOrgDomain, selectFirstAvailableTimeSlotNextMonth, bookTimeSlot } from "../lib/testUtils";
import { createAttributes } from "../lib/test-helpers/organizationHelpers";

test.describe.configure({ mode: "parallel" });

async function ensureOrgMemberships(orgId: number, userIds: number[]) {
  for (const userId of userIds) {
    const existing = await prisma.membership.findFirst({
      where: { userId, teamId: orgId },
    });
    if (!existing) {
      await prisma.membership.create({
        data: {
          teamId: orgId,
          userId,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });
    }
  }
}

async function getOrgMemberIndex(orgId: number, userId: number): Promise<number> {
  const memberships = await prisma.membership.findMany({
    where: { teamId: orgId },
    select: { userId: true },
  });
  const idx = memberships.findIndex((m) => m.userId === userId);
  if (idx === -1) {
    throw new Error(`User ${userId} not found in org ${orgId} memberships`);
  }
  return idx;
}

test.describe("Event type with assignAllTeamMembers + attribute segment filter", () => {
  test.afterEach(async ({ orgs, users }) => {
    await users.deleteAll();
    await orgs.deleteAll();
  });

  test.describe("SINGLE_SELECT attribute filter", () => {
    test("Round Robin booking is assigned to member matching select_equals filter", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);
      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate2 = allUsers.find((u) => u.name === "teammate-2")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);
      const mate2Idx = await getOrgMemberIndex(org.id, mate2.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Department",
            type: "SINGLE_SELECT",
            options: ["Engineering", "Sales"],
          },
        ],
        assignments: [
          { memberIndex: ownerIdx, attributeValues: { Department: ["Engineering"] } },
          { memberIndex: mate1Idx, attributeValues: { Department: ["Sales"] } },
          { memberIndex: mate2Idx, attributeValues: { Department: ["Sales"] } },
        ],
      });

      const departmentAttr = attributes!.find((a) => a.name === "Department")!;
      const engineeringOpt = departmentAttr.options.find((o) => o.value === "Engineering")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: departmentAttr.id,
                  value: [engineeringOpt.id],
                  operator: "select_equals",
                  valueSrc: ["value"],
                  valueType: ["select"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).not.toBeNull();
        expect(chosenUser).toBe("owner-user");
      });
    });
  });

  test.describe("MULTI_SELECT attribute filter", () => {
    test("Round Robin booking is assigned to member matching multiselect_some_in filter", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);
      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate2 = allUsers.find((u) => u.name === "teammate-2")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);
      const mate2Idx = await getOrgMemberIndex(org.id, mate2.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Skills",
            type: "MULTI_SELECT",
            options: ["JavaScript", "React", "Python"],
          },
        ],
        assignments: [
          { memberIndex: ownerIdx, attributeValues: { Skills: ["JavaScript", "React"] } },
          { memberIndex: mate1Idx, attributeValues: { Skills: ["Python"] } },
          { memberIndex: mate2Idx, attributeValues: { Skills: ["Python"] } },
        ],
      });

      const skillsAttr = attributes!.find((a) => a.name === "Skills")!;
      const jsOpt = skillsAttr.options.find((o) => o.value === "JavaScript")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: skillsAttr.id,
                  value: [[jsOpt.id]],
                  operator: "multiselect_some_in",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).not.toBeNull();
        expect(chosenUser).toBe("owner-user");
      });
    });
  });

  test.describe("TEXT attribute filter", () => {
    test("Round Robin booking is assigned to member matching text equal filter", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);
      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate2 = allUsers.find((u) => u.name === "teammate-2")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);
      const mate2Idx = await getOrgMemberIndex(org.id, mate2.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Region",
            type: "TEXT",
            options: ["US", "EU"],
          },
        ],
        assignments: [
          { memberIndex: ownerIdx, attributeValues: { Region: ["US"] } },
          { memberIndex: mate1Idx, attributeValues: { Region: ["EU"] } },
          { memberIndex: mate2Idx, attributeValues: { Region: ["EU"] } },
        ],
      });

      const regionAttr = attributes!.find((a) => a.name === "Region")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: regionAttr.id,
                  value: ["US"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).not.toBeNull();
        expect(chosenUser).toBe("owner-user");
      });
    });
  });

  test.describe("NUMBER attribute filter", () => {
    test("Round Robin booking is assigned to member matching number equal filter", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);
      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate2 = allUsers.find((u) => u.name === "teammate-2")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);
      const mate2Idx = await getOrgMemberIndex(org.id, mate2.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Experience",
            type: "NUMBER",
            options: ["5", "2"],
          },
        ],
        assignments: [
          { memberIndex: ownerIdx, attributeValues: { Experience: ["5"] } },
          { memberIndex: mate1Idx, attributeValues: { Experience: ["2"] } },
          { memberIndex: mate2Idx, attributeValues: { Experience: ["2"] } },
        ],
      });

      const expAttr = attributes!.find((a) => a.name === "Experience")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: expAttr.id,
                  value: [5],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["number"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).not.toBeNull();
        expect(chosenUser).toBe("owner-user");
      });
    });
  });

  test.describe("Members without attribute assigned are excluded", () => {
    test("SINGLE_SELECT - members without attribute are excluded from booking", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Department",
            type: "SINGLE_SELECT",
            options: ["Engineering", "Sales"],
          },
        ],
        assignments: [{ memberIndex: mate1Idx, attributeValues: { Department: ["Engineering"] } }],
      });

      const departmentAttr = attributes!.find((a) => a.name === "Department")!;
      const engineeringOpt = departmentAttr.options.find((o) => o.value === "Engineering")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: departmentAttr.id,
                  value: [engineeringOpt.id],
                  operator: "select_equals",
                  valueSrc: ["value"],
                  valueType: ["select"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).toBe("teammate-1");
      });
    });

    test("MULTI_SELECT - members without attribute are excluded from booking", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Skills",
            type: "MULTI_SELECT",
            options: ["JavaScript", "React", "Python"],
          },
        ],
        assignments: [{ memberIndex: mate1Idx, attributeValues: { Skills: ["JavaScript", "React"] } }],
      });

      const skillsAttr = attributes!.find((a) => a.name === "Skills")!;
      const jsOpt = skillsAttr.options.find((o) => o.value === "JavaScript")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: skillsAttr.id,
                  value: [[jsOpt.id]],
                  operator: "multiselect_some_in",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).toBe("teammate-1");
      });
    });

    test("TEXT - members without attribute are excluded from booking", async ({ page, users, orgs }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Region",
            type: "TEXT",
            options: ["US", "EU"],
          },
        ],
        assignments: [{ memberIndex: mate1Idx, attributeValues: { Region: ["US"] } }],
      });

      const regionAttr = attributes!.find((a) => a.name === "Region")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: regionAttr.id,
                  value: ["US"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).toBe("teammate-1");
      });
    });

    test("NUMBER - members without attribute are excluded from booking", async ({ page, users, orgs }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Experience",
            type: "NUMBER",
            options: ["5", "2"],
          },
        ],
        assignments: [{ memberIndex: mate1Idx, attributeValues: { Experience: ["5"] } }],
      });

      const expAttr = attributes!.find((a) => a.name === "Experience")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: expAttr.id,
                  value: [5],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["number"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).toBe("teammate-1");
      });
    });
  });

  test.describe("Negation operators - unassigned members should match", () => {
    test("select_not_any_in - members without attribute match negation filter", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Department",
            type: "SINGLE_SELECT",
            options: ["Engineering", "Sales"],
          },
        ],
        assignments: [{ memberIndex: ownerIdx, attributeValues: { Department: ["Engineering"] } }],
      });

      const departmentAttr = attributes!.find((a) => a.name === "Department")!;
      const engineeringOpt = departmentAttr.options.find((o) => o.value === "Engineering")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: departmentAttr.id,
                  value: [[engineeringOpt.id]],
                  operator: "select_not_any_in",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).toBe("teammate-1");
      });
    });

    test("multiselect_not_some_in - members without attribute match negation filter", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Skills",
            type: "MULTI_SELECT",
            options: ["JavaScript", "React", "Python"],
          },
        ],
        assignments: [{ memberIndex: ownerIdx, attributeValues: { Skills: ["JavaScript"] } }],
      });

      const skillsAttr = attributes!.find((a) => a.name === "Skills")!;
      const jsOpt = skillsAttr.options.find((o) => o.value === "JavaScript")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: skillsAttr.id,
                  value: [[jsOpt.id]],
                  operator: "multiselect_not_some_in",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).toBe("teammate-1");
      });
    });

    test("not_equal (TEXT) - members without attribute match negation filter", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Region",
            type: "TEXT",
            options: ["US", "EU"],
          },
        ],
        assignments: [{ memberIndex: ownerIdx, attributeValues: { Region: ["US"] } }],
      });

      const regionAttr = attributes!.find((a) => a.name === "Region")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: regionAttr.id,
                  value: ["US"],
                  operator: "not_equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).toBe("teammate-1");
      });
    });

    test("not_equal (NUMBER) - members without attribute match negation filter", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Experience",
            type: "NUMBER",
            options: ["5", "2"],
          },
        ],
        assignments: [{ memberIndex: ownerIdx, attributeValues: { Experience: ["5"] } }],
      });

      const expAttr = attributes!.find((a) => a.name === "Experience")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: expAttr.id,
                  value: [5],
                  operator: "not_equal",
                  valueSrc: ["value"],
                  valueType: ["number"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).toBe("teammate-1");
      });
    });
  });

  test.describe("Edge cases", () => {
    test("No members have attribute assigned - no available time slots", async ({ page, users, orgs }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Department",
            type: "SINGLE_SELECT",
            options: ["Engineering", "Sales"],
          },
        ],
      });

      const departmentAttr = attributes!.find((a) => a.name === "Department")!;
      const engineeringOpt = departmentAttr.options.find((o) => o.value === "Engineering")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: departmentAttr.id,
                  value: [engineeringOpt.id],
                  operator: "select_equals",
                  valueSrc: ["value"],
                  valueType: ["select"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        const incrementMonth = page.getByTestId("incrementMonth");
        await incrementMonth.waitFor();
        await incrementMonth.click();

        await expect(page.locator('[data-testid="day"][data-disabled="false"]')).toHaveCount(0, {
          timeout: 15000,
        });
      });
    });

    test("No members match attribute filter - no available time slots", async ({ page, users, orgs }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);
      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Department",
            type: "SINGLE_SELECT",
            options: ["Engineering", "Sales", "Marketing"],
          },
        ],
        assignments: [
          { memberIndex: ownerIdx, attributeValues: { Department: ["Engineering"] } },
          { memberIndex: mate1Idx, attributeValues: { Department: ["Sales"] } },
        ],
      });

      const departmentAttr = attributes!.find((a) => a.name === "Department")!;
      const marketingOpt = departmentAttr.options.find((o) => o.value === "Marketing")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: departmentAttr.id,
                  value: [marketingOpt.id],
                  operator: "select_equals",
                  valueSrc: ["value"],
                  valueType: ["select"],
                },
              },
            },
          },
        },
      });

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        const incrementMonth = page.getByTestId("incrementMonth");
        await incrementMonth.waitFor();
        await incrementMonth.click();

        await expect(page.locator('[data-testid="day"][data-disabled="false"]')).toHaveCount(0, {
          timeout: 15000,
        });
      });
    });

    test("All members match attribute filter - booking succeeds with any host", async ({
      page,
      users,
      orgs,
    }) => {
      const org = await orgs.create({ name: "TestOrg" });
      const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

      const owner = await users.create(
        {
          username: "owner-user",
          name: "owner-user",
          organizationId: org.id,
          roleInOrganization: MembershipRole.MEMBER,
        },
        {
          hasTeam: true,
          teammates: teamMatesObj,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
        }
      );

      const { team } = await owner.getFirstTeamMembership();
      const teamEvent = await owner.getFirstTeamEvent(team.id);

      const allUsers = users.get();
      await ensureOrgMemberships(
        org.id,
        allUsers.map((u) => u.id)
      );

      const ownerIdx = await getOrgMemberIndex(org.id, owner.id);
      const mate1 = allUsers.find((u) => u.name === "teammate-1")!;
      const mate2 = allUsers.find((u) => u.name === "teammate-2")!;
      const mate1Idx = await getOrgMemberIndex(org.id, mate1.id);
      const mate2Idx = await getOrgMemberIndex(org.id, mate2.id);

      const attributes = await createAttributes({
        orgId: org.id,
        attributes: [
          {
            name: "Department",
            type: "SINGLE_SELECT",
            options: ["Engineering", "Sales"],
          },
        ],
        assignments: [
          { memberIndex: ownerIdx, attributeValues: { Department: ["Engineering"] } },
          { memberIndex: mate1Idx, attributeValues: { Department: ["Engineering"] } },
          { memberIndex: mate2Idx, attributeValues: { Department: ["Engineering"] } },
        ],
      });

      const departmentAttr = attributes!.find((a) => a.name === "Department")!;
      const engineeringOpt = departmentAttr.options.find((o) => o.value === "Engineering")!;

      await prisma.eventType.update({
        where: { id: teamEvent.id },
        data: {
          assignAllTeamMembers: true,
          assignRRMembersUsingSegment: true,
          rrSegmentQueryValue: {
            id: "query-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: departmentAttr.id,
                  value: [engineeringOpt.id],
                  operator: "select_equals",
                  valueSrc: ["value"],
                  valueType: ["select"],
                },
              },
            },
          },
        },
      });

      const allNames = ["owner-user", "teammate-1", "teammate-2"];

      await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
        await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.getByTestId("success-page")).toBeVisible();

        const chosenUser = await page.getByTestId("booking-host-name").textContent();
        expect(chosenUser).not.toBeNull();
        expect(allNames).toContain(chosenUser);
      });
    });
  });
});

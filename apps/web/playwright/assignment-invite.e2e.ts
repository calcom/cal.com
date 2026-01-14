import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("Event Type Assignment - Invite Member", () => {
  test("Can invite a new member via email from the assignment dropdown", async ({ page, users, prisma }) => {
    // 1. Create a user owner
    const owner = await users.create();

    // 2. Create a team
    const team = await prisma.team.create({
      data: {
        name: "Test Team",
        slug: "test-team",
        members: {
          create: {
            userId: owner.id,
            role: "OWNER",
            accepted: true,
          },
        },
      },
    });

    // 3. Create a team event type (Round Robin to enable assignment logic often)
    const eventType = await prisma.eventType.create({
      data: {
        title: "Test Event Type",
        slug: "test-event-type",
        length: 30,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
        users: {
          create: {
            userId: owner.id,
          },
        },
      },
    });

    // 4. Login as owner
    await owner.apiLogin();

    // 5. Navigate to the event type page
    await page.goto(`/event-types/${eventType.id}?tabName=hosts`);

    // 6. Find the hosts select dropdown
    // We look for the combobox. In the assignment tab, it's usually the main interaction.
    const hostsSelect = page.getByRole("combobox").first();
    await hostsSelect.click();

    // 7. Type a new email
    const newEmail = "new-invitee@example.com";
    await hostsSelect.fill(newEmail);

    // 8. Wait for the "Invite <email>" option given by CreatableSelect and select it
    // The text typically says "Invite new-invitee@example.com" or similar
    await page.getByText(`Invite ${newEmail}`).click();

    // 9. Save the event type
    await page.getByTestId("update-eventtype").click();

    // Wait for success toast
    await expect(page.getByText("Event type updated successfully")).toBeVisible();

    // 10. Verify via DB
    // a) Check if the user was created/exists
    const invitedUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });
    expect(invitedUser).not.toBeNull();

    if (!invitedUser) throw new Error("Invited user not found");

    // b) Check if membership was created
    const membership = await prisma.membership.findFirst({
      where: {
        teamId: team.id,
        userId: invitedUser.id,
        role: "MEMBER",
        accepted: false,
      },
    });
    expect(membership).not.toBeNull();

    // c) Check if the user is assigned as a host to the event type
    const updatedEventType = await prisma.eventType.findUnique({
      where: { id: eventType.id },
      include: { hosts: true },
    });

    const isAssigned = updatedEventType?.hosts.some((h) => h.userId === invitedUser.id);
    expect(isAssigned).toBe(true);
  });
});

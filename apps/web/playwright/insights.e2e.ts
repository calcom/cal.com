import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const createTeamsAndMembership = async (userIdOne: number, userIdTwo: number) => {
  const teamOne = await prisma.team.create({
    data: {
      name: "test-insights",
      slug: `test-insights-${Date.now()}-${randomString(5)}}`,
    },
  });

  const teamTwo = await prisma.team.create({
    data: {
      name: "test-insights-2",
      slug: `test-insights-2-${Date.now()}-${randomString(5)}}`,
    },
  });
  if (!userIdOne || !userIdTwo || !teamOne || !teamTwo) {
    throw new Error("Failed to create test data");
  }

  // create memberships
  await prisma.membership.create({
    data: {
      userId: userIdOne,
      teamId: teamOne.id,
      accepted: true,
      role: "ADMIN",
    },
  });
  await prisma.membership.create({
    data: {
      teamId: teamTwo.id,
      userId: userIdOne,
      accepted: true,
      role: "ADMIN",
    },
  });
  await prisma.membership.create({
    data: {
      teamId: teamOne.id,
      userId: userIdTwo,
      accepted: true,
      role: "MEMBER",
    },
  });
  await prisma.membership.create({
    data: {
      teamId: teamTwo.id,
      userId: userIdTwo,
      accepted: true,
      role: "MEMBER",
    },
  });
  return { teamOne, teamTwo };
};

test.afterAll(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Insights", async () => {
  test("should test download button", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");
    await page.waitForLoadState("networkidle");

    const downloadPromise = page.waitForEvent("download");

    // Expect download button to be visible
    expect(await page.locator("text=Download").isVisible()).toBeTruthy();

    // Click on Download button
    await page.getByText("Download").click();

    // Expect as csv option to be visible
    expect(await page.locator("text=as CSV").isVisible()).toBeTruthy();

    // Start waiting for download before clicking. Note no await.
    await page.getByText("as CSV").click();
    const download = await downloadPromise;

    // Wait for the download process to complete and save the downloaded file somewhere.
    await download.saveAs("./" + "test-insights.csv");
  });
});

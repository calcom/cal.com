import { expect } from "@playwright/test";
import path from "node:path";

import { CAL_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

import { test } from "../lib/fixtures";

test.describe("User Avatar", async () => {
  test("it can upload a user profile image", async ({ page, users }) => {
    const user = await users.create({ name: "John Doe" });
    await user.apiLogin();

    let objectKey: string;

    await test.step("Can upload an initial picture", async () => {
      await page.goto("/settings/my-account/profile");

      await page.getByTestId("open-upload-avatar-dialog").click();

      const [fileChooser] = await Promise.all([
        // It is important to call waitForEvent before click to set up waiting.
        page.waitForEvent("filechooser"),
        // Opens the file chooser.
        page
          .getByTestId("open-upload-image-filechooser")
          .click(),
      ]);

      await fileChooser.setFiles(`${path.dirname(__filename)}/../fixtures/cal.png`);

      await page.getByTestId("upload-avatar").click();

      await page.getByText("Update").click();
      await page.waitForSelector("text=Settings updated successfully");

      const response = await prisma.avatar.findUniqueOrThrow({
        where: {
          teamId_userId_isBanner: {
            userId: user.id,
            teamId: 0,
            isBanner: false,
          },
        },
      });

      objectKey = response.objectKey;

      const avatarImage = page.getByTestId("profile-upload-avatar").locator("img");

      await expect(avatarImage).toHaveAttribute("src", new RegExp(`^\/api\/avatar\/${objectKey}\.png$`));

      const urlResponse = await page.request.get((await avatarImage.getAttribute("src")) || "", {
        maxRedirects: 0,
      });

      await expect(urlResponse?.status()).toBe(200);
    });

    await test.step("View avatar on the public page", async () => {
      await page.goto(`/${user.username}`);

      await expect(page.locator(`img`)).toHaveAttribute(
        "src",
        new RegExp(`\/api\/avatar\/${objectKey}\.png$`)
      );
      // verify objectKey is passed to the OG image
      // yes, OG image URI encodes at multiple places.. don't want to mess with that.
      const ogImageLocator = page.locator('meta[property="og:image"]');
      await expect(ogImageLocator).toHaveCount(1);
      const searchParam = `meetingImage=${encodeURIComponent(`${CAL_URL}/api/avatar/${objectKey}.png`)}`;
      await expect(ogImageLocator).toHaveAttribute("content", new RegExp(encodeURIComponent(searchParam)));
    });
  });
});

test.describe("Team Logo", async () => {
  test("it can upload a team logo image", async ({ page, users }) => {
    const user = await users.create(undefined, { hasTeam: true });

    const { team } = await user.getFirstTeamMembership();

    await user.apiLogin();

    await page.goto(`/settings/teams/${team.id}/profile`);

    await test.step("Can upload an initial picture", async () => {
      await page.getByTestId("open-upload-avatar-dialog").click();

      const [fileChooser] = await Promise.all([
        // It is important to call waitForEvent before click to set up waiting.
        page.waitForEvent("filechooser"),
        // Opens the file chooser.
        page
          .getByTestId("open-upload-image-filechooser")
          .click(),
      ]);

      await fileChooser.setFiles(`${path.dirname(__filename)}/../fixtures/cal.png`);

      await page.getByTestId("upload-avatar").click();

      await page.getByText("Update").click();
      await page.waitForSelector("text=Your team has been updated successfully.");

      const response = await prisma.avatar.findUniqueOrThrow({
        where: {
          teamId_userId_isBanner: {
            userId: 0,
            teamId: team.id,
            isBanner: false,
          },
        },
      });

      const avatarImage = page.getByTestId("profile-upload-logo").locator("img");

      await expect(avatarImage).toHaveAttribute(
        "src",
        new RegExp(`^\/api\/avatar\/${response.objectKey}\.png$`)
      );

      const urlResponse = await page.request.get((await avatarImage.getAttribute("src")) || "", {
        maxRedirects: 0,
      });

      await expect(urlResponse?.status()).toBe(200);

      await expect(
        page.getByTestId("tab-teams").locator(`img[src="/api/avatar/${response.objectKey}.png"]`)
      ).toBeVisible();
    });
  });
});

test.describe("Organization Logo", async () => {
  test("it can upload a organization logo image", async ({ page, users, orgs }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();

    await owner.apiLogin();
    await page.goto("/settings/organizations/profile");

    let objectKey: string;

    await test.step("Can upload an initial picture", async () => {
      await page.getByTestId("open-upload-avatar-dialog").click();

      const [fileChooser] = await Promise.all([
        // It is important to call waitForEvent before click to set up waiting.
        page.waitForEvent("filechooser"),
        // Opens the file chooser.
        page
          .getByTestId("open-upload-image-filechooser")
          .click(),
      ]);

      await fileChooser.setFiles(`${path.dirname(__filename)}/../fixtures/cal.png`);

      await page.getByTestId("upload-avatar").click();

      await page.getByTestId("update-org-profile-button").click();
      await page.waitForSelector("text=Your organization updated successfully");

      const response = await prisma.avatar.findUniqueOrThrow({
        where: {
          teamId_userId_isBanner: {
            userId: 0,
            teamId: org.id,
            isBanner: false,
          },
        },
      });

      objectKey = response.objectKey;

      const avatarImage = page.getByTestId("profile-upload-logo").locator("img");

      await expect(avatarImage).toHaveAttribute(
        "src",
        new RegExp(`^\/api\/avatar\/${response.objectKey}\.png$`)
      );

      const urlResponse = await page.request.get((await avatarImage.getAttribute("src")) || "", {
        maxRedirects: 0,
      });

      await expect(urlResponse?.status()).toBe(200);

      // TODO: Implement the org logo updating in the sidebar
      //       this should be done in the orgBrandingContext
    });

    const requestedSlug = org.metadata?.requestedSlug;

    await test.step("it shows the correct logo on the unpublished public page", async () => {
      await page.goto(`/org/${requestedSlug}`);

      await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);

      await expect(page.locator(`img`)).toHaveAttribute(
        "src",
        new RegExp(`^\/api\/avatar\/${objectKey}\.png$`)
      );
    });

    // TODO: add test for published team.
    // unpublished works regardless of orgDomain but when it is published it does work
  });
});

import { expect } from "@playwright/test";
import path from "path";

import { prisma } from "@calcom/prisma";

import { test } from "../lib/fixtures";

test.describe("UploadAvatar", async () => {
  test("it can upload a user profile image", async ({ page, users }) => {
    const user = await users.create({});
    await user.apiLogin();

    await test.step("Can upload an initial picture", async () => {
      await page.goto("/settings/my-account/profile");

      await page.getByTestId("open-upload-avatar-dialog").click();

      const [fileChooser] = await Promise.all([
        // It is important to call waitForEvent before click to set up waiting.
        page.waitForEvent("filechooser"),
        // Opens the file chooser.
        page.getByTestId("open-upload-image-filechooser").click(),
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

      const avatarImage = page.getByTestId("profile-upload-avatar").locator("img");

      await expect(avatarImage).toHaveAttribute(
        "src",
        new RegExp(`^\/api\/avatar\/${response.objectKey}\.png$`)
      );

      const urlResponse = await page.request.get((await avatarImage.getAttribute("src")) || "", {
        maxRedirects: 0,
      });

      await expect(urlResponse?.status()).toBe(200);
    });
  });

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
        page.getByTestId("open-upload-image-filechooser").click(),
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

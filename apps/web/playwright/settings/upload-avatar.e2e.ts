import { expect } from "@playwright/test";
import path from "path";

import { prisma } from "@calcom/prisma";

import { test } from "../lib/fixtures";

test.describe("UploadAvatar", async () => {
  test("can upload an image", async ({ page, users }) => {
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

      await page.locator("input[name='name']").fill(user.email);

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
});

import { expect } from "@playwright/test";
import path from "path";

import { prisma } from "@calcom/prisma";

import { test } from "../lib/fixtures";

test.describe("Business Logo Upload", async () => {
  test("User can upload a business logo", async ({ page, users }) => {
    const user = await users.create({ name: "John Doe" });
    await user.apiLogin();

    let objectKey: string;

    await test.step("Can upload a business logo", async () => {
      // Navigate to appearance settings
      await page.goto("/settings/my-account/appearance");

      // Click the upload logo button
      await page.getByTestId("open-upload-business-logo-dialog").click();

      // Select and upload the test logo file
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByTestId("open-upload-image-filechooser").click(),
      ]);

      await fileChooser.setFiles(`${path.dirname(__filename)}/../fixtures/branding/test-logo.png`);

      // Confirm upload
      await page.getByTestId("upload-avatar").click();

      // Wait for success toast
      await page.waitForSelector("text=Logo uploaded successfully");

      // Verify the Avatar record was created in the database
      const response = await prisma.avatar.findFirst({
        where: {
          userId: user.id,
          teamId: -1, // User branding assets use teamId=-1
          isBanner: false, // Logo uses isBanner=false
        },
      });

      expect(response).toBeTruthy();
      objectKey = response!.objectKey;

      // Verify user metadata was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { metadata: true },
      });

      expect(updatedUser?.metadata).toHaveProperty("businessLogo");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((updatedUser?.metadata as any).businessLogo.objectKey).toBe(objectKey);
    });

    await test.step("Logo preview displays in appearance settings", async () => {
      // Reload page to verify logo persists
      await page.goto("/settings/my-account/appearance");

      // Verify the preview image is visible
      const logoPreview = page.locator('img[alt="Business logo preview"]');
      await expect(logoPreview).toBeVisible();
      await expect(logoPreview).toHaveAttribute("src", new RegExp(`^/api/avatar/${objectKey}.png$`));

      // Verify the image URL is accessible
      const urlResponse = await page.request.get((await logoPreview.getAttribute("src")) || "", {
        maxRedirects: 0,
      });
      await expect(urlResponse?.status()).toBe(200);
    });

    await test.step("Uploaded logo displays on public booking page", async () => {
      // Navigate to user's public page
      await page.goto(`/${user.username}`);

      // Verify the logo is displayed
      const publicLogo = page.locator('img[alt="Business logo"]');
      await expect(publicLogo).toBeVisible();
      await expect(publicLogo).toHaveAttribute("src", `/api/avatar/${objectKey}.png`);

      // Verify the logo has correct styling (centered, max dimensions)
      await expect(publicLogo).toHaveClass(/mx-auto/);
      await expect(publicLogo).toHaveClass(/max-h-\[150px\]/);
      await expect(publicLogo).toHaveClass(/max-w-\[400px\]/);
    });
  });

  test("User can replace existing logo", async ({ page, users }) => {
    const user = await users.create({ name: "Jane Smith" });
    await user.apiLogin();

    let firstObjectKey: string;
    let secondObjectKey: string;

    await test.step("Upload initial logo", async () => {
      await page.goto("/settings/my-account/appearance");
      await page.getByTestId("open-upload-business-logo-dialog").click();

      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByTestId("open-upload-image-filechooser").click(),
      ]);

      await fileChooser.setFiles(`${path.dirname(__filename)}/../fixtures/branding/test-logo.png`);
      await page.getByTestId("upload-avatar").click();
      await page.waitForSelector("text=Logo uploaded successfully");

      const response = await prisma.avatar.findFirst({
        where: { userId: user.id, teamId: -1, isBanner: false },
      });
      firstObjectKey = response!.objectKey;
    });

    await test.step("Replace with new logo", async () => {
      await page.goto("/settings/my-account/appearance");

      // Click the "Replace Logo" button (button text changes when logo exists)
      await page.getByTestId("open-upload-business-logo-dialog").click();

      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByTestId("open-upload-image-filechooser").click(),
      ]);

      // Upload the same file again (simulates replacement)
      await fileChooser.setFiles(`${path.dirname(__filename)}/../fixtures/cal.png`);
      await page.getByTestId("upload-avatar").click();
      await page.waitForSelector("text=Logo uploaded successfully");

      // Verify new Avatar record was created
      const response = await prisma.avatar.findFirst({
        where: { userId: user.id, teamId: -1, isBanner: false },
      });
      secondObjectKey = response!.objectKey;

      // Verify the objectKey changed
      expect(secondObjectKey).not.toBe(firstObjectKey);

      // Verify old Avatar record was deleted
      const oldAvatar = await prisma.avatar.findUnique({
        where: {
          teamId_userId_isBanner_objectKey: {
            teamId: -1,
            userId: user.id,
            isBanner: false,
            objectKey: firstObjectKey,
          },
        },
      });
      expect(oldAvatar).toBeNull();
    });

    await test.step("New logo displays on public page", async () => {
      await page.goto(`/${user.username}`);

      const publicLogo = page.locator('img[alt="Business logo"]');
      await expect(publicLogo).toBeVisible();
      await expect(publicLogo).toHaveAttribute("src", `/api/avatar/${secondObjectKey}.png`);
    });
  });

  test("User can delete logo", async ({ page, users }) => {
    const user = await users.create({ name: "Bob Johnson" });
    await user.apiLogin();

    await test.step("Upload logo", async () => {
      await page.goto("/settings/my-account/appearance");
      await page.getByTestId("open-upload-business-logo-dialog").click();

      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByTestId("open-upload-image-filechooser").click(),
      ]);

      await fileChooser.setFiles(`${path.dirname(__filename)}/../fixtures/branding/test-logo.png`);
      await page.getByTestId("upload-avatar").click();
      await page.waitForSelector("text=Logo uploaded successfully");

      const response = await prisma.avatar.findFirst({
        where: { userId: user.id, teamId: -1, isBanner: false },
      });
      expect(response).toBeTruthy();
    });

    await test.step("Delete logo", async () => {
      await page.goto("/settings/my-account/appearance");

      // Click the delete button
      await page.getByTestId("delete-business-logo-btn").click();

      // Confirm deletion (browser confirm dialog)
      page.on("dialog", (dialog) => dialog.accept());

      // Wait for success toast
      await page.waitForSelector("text=Logo deleted successfully");

      // Verify Avatar record was deleted from database
      const deletedAvatar = await prisma.avatar.findFirst({
        where: { userId: user.id, teamId: -1, isBanner: false },
      });
      expect(deletedAvatar).toBeNull();

      // Verify metadata was cleared
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { metadata: true },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((updatedUser?.metadata as any)?.businessLogo).toBeUndefined();
    });

    await test.step("Logo no longer displays on public page", async () => {
      await page.goto(`/${user.username}`);

      // Verify the logo is not present
      const publicLogo = page.locator('img[alt="Business logo"]');
      await expect(publicLogo).not.toBeVisible();
    });

    await test.step("Upload button text reverts to 'Upload Logo'", async () => {
      await page.goto("/settings/my-account/appearance");

      // Verify button text changed back
      const uploadButton = page.getByTestId("open-upload-business-logo-dialog");
      await expect(uploadButton).toContainText("Upload Logo");
    });
  });
});


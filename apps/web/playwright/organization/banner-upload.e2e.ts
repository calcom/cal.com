import { expect } from "@playwright/test";
import path from "path";

import { prisma } from "@calcom/prisma";

import { test } from "../lib/fixtures";

test.describe("Organization Banner Upload", () => {
  test("it can upload an organization banner image", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();

    await owner.apiLogin();
    await page.goto("/settings/organizations/profile");

    let objectKey: string;

    await test.step("Can upload an initial banner", async () => {
      await page.getByTestId("open-upload-banner-dialog").click();

      const [fileChooser] = await Promise.all([
        // It is important to call waitForEvent before click to set up waiting.
        page.waitForEvent("filechooser"),
        // Opens the file chooser.
        page.getByTestId("open-upload-image-filechooser").click(),
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
            isBanner: true,
          },
        },
      });

      objectKey = response.objectKey;

      const bannerImage = page.getByTestId("profile-upload-banner").locator("img");

      await expect(bannerImage).toHaveAttribute(
        "src",
        new RegExp(`^/api/avatar/${response.objectKey}\\.png$`)
      );

      const urlResponse = await page.request.get((await bannerImage.getAttribute("src")) || "", {
        maxRedirects: 0,
      });

      await expect(urlResponse?.status()).toBe(200);
    });

    await test.step("Can remove the banner", async () => {
      // Click the remove banner button
      await page.getByRole("button", { name: "Remove" }).click();

      await page.getByTestId("update-org-profile-button").click();
      await page.waitForSelector("text=Your organization updated successfully");

      // Verify banner is removed from database
      const response = await prisma.avatar.findUnique({
        where: {
          teamId_userId_isBanner: {
            userId: 0,
            teamId: org.id,
            isBanner: true,
          },
        },
      });

      expect(response).toBeNull();

      // Verify fallback text is shown
      await expect(page.getByText("no banner")).toBeVisible();
    });

    const slug = org.metadata?.requestedSlug ?? org.slug;

    await test.step("Can re-upload a banner after removal", async () => {
      await page.getByTestId("open-upload-banner-dialog").click();

      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByTestId("open-upload-image-filechooser").click(),
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
            isBanner: true,
          },
        },
      });

      objectKey = response.objectKey;

      const bannerImage = page.getByTestId("profile-upload-banner").locator("img");

      await expect(bannerImage).toHaveAttribute(
        "src",
        new RegExp(`^/api/avatar/${response.objectKey}\\.png$`)
      );
    });

    await test.step("Banner displays correctly on organization public page", async () => {
      await page.goto(`/org/${slug}`);

      await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);

      // Check for banner image on the organization page
      const bannerImg = page.locator(`img[src*="/api/avatar/${objectKey}.png"]`).first();
      await expect(bannerImg).toBeVisible();
    });
  });

  test("it shows validation error for oversized banner images", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });

    await owner.apiLogin();
    await page.goto("/settings/organizations/profile");

    await test.step("Shows error for oversized image", async () => {
      await page.getByTestId("open-upload-banner-dialog").click();

      await page.evaluate(() => {
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          // Create a fake file that exceeds the size limit
          const file = new File([new ArrayBuffer(6 * 1024 * 1024)], "large-banner.png", {
            type: "image/png",
          });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });

      // Wait for error toast
      await expect(page.getByText("Image size exceed the limit")).toBeVisible();
    });
  });

  test("it shows dimension warning for incorrect banner dimensions", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });

    await owner.apiLogin();
    await page.goto("/settings/organizations/profile");

    await test.step("Shows warning for incorrect dimensions", async () => {
      await page.getByTestId("open-upload-banner-dialog").click();

      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByTestId("open-upload-image-filechooser").click(),
      ]);

      // Use the existing cal.png fixture which likely isn't 1500x500
      await fileChooser.setFiles(`${path.dirname(__filename)}/../fixtures/cal.png`);

      // Wait for dimension warning toast
      await expect(page.getByText(/Please use an image with/)).toBeVisible();
    });
  });

  test("it preserves banner when updating profile without banner changes", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();

    await owner.apiLogin();
    await page.goto("/settings/organizations/profile");

    let objectKey: string;

    await test.step("Upload initial banner", async () => {
      await page.getByTestId("open-upload-banner-dialog").click();

      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByTestId("open-upload-image-filechooser").click(),
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
            isBanner: true,
          },
        },
      });

      objectKey = response.objectKey;

      const bannerImage = page.getByTestId("profile-upload-banner").locator("img");
      await expect(bannerImage).toHaveAttribute(
        "src",
        new RegExp(`^/api/avatar/${response.objectKey}\\.png$`)
      );
    });

    await test.step("Update organization name without touching banner", async () => {
      await page.getByLabel("Organization name").fill("Updated Organization Name");

      await page.getByTestId("update-org-profile-button").click();
      await page.waitForSelector("text=Your organization updated successfully");
    });

    await test.step("Verify banner is preserved after profile update", async () => {
      const response = await prisma.avatar.findUniqueOrThrow({
        where: {
          teamId_userId_isBanner: {
            userId: 0,
            teamId: org.id,
            isBanner: true,
          },
        },
      });

      expect(response.objectKey).toBe(objectKey);

      const bannerImage = page.getByTestId("profile-upload-banner").locator("img");
      await expect(bannerImage).toHaveAttribute("src", new RegExp(`^/api/avatar/${objectKey}\\.png$`));

      await expect(page.getByRole("textbox", { name: "Organization name" })).toHaveValue(
        "Updated Organization Name"
      );
    });
  });
});

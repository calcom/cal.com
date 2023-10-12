import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("unauthorized user sees correct translations (de)", async () => {
  test.use({
    locale: "de",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    {
      const locator = page.getByText("Willkommen zurück");
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back");
      expect(await locator.count()).toEqual(0);
    }

    const htmlLocator = page.locator("html");

    expect(await htmlLocator.getAttribute("lang")).toEqual("de");
    expect(await htmlLocator.getAttribute("dir")).toEqual("ltr");
  });
});

test.describe("unauthorized user sees correct translations (ar)", async () => {
  test.use({
    locale: "ar",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    {
      const locator = page.getByText("أهلاً بك من جديد");
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back");
      expect(await locator.count()).toEqual(0);
    }

    const htmlLocator = page.locator("html");

    expect(await htmlLocator.getAttribute("lang")).toEqual("ar");
    expect(await htmlLocator.getAttribute("dir")).toEqual("rtl");
  });
});

test.describe("authorized user sees correct translations (de)", async () => {
  test.use({
    locale: "en",
  });

  test("should return correct translations and html attributes", async ({ page, users }) => {
    await test.step("should create a de user", async () => {
      const user = await users.create({
        locale: "de",
      });
      await user.apiLogin();
    });

    await test.step("should navigate to /event-types and show German translations", async () => {
      await page.goto("/event-types");

      await page.waitForLoadState("networkidle");

      {
        const locator = page.getByText("Ereignistypen");
        expect(await locator.count()).toBeGreaterThanOrEqual(1);
      }

      {
        const locator = page.getByText("Event Types");
        expect(await locator.count()).toEqual(0);
      }

      const htmlLocator = page.locator("html");

      expect(await htmlLocator.getAttribute("lang")).toEqual("de");
      expect(await htmlLocator.getAttribute("dir")).toEqual("ltr");
    });

    await test.step("should navigate to /bookings and show German translations", async () => {
      await page.goto("/bookings");

      await page.waitForLoadState("networkidle");

      {
        const locator = page.getByText("Buchungen", { exact: true });
        expect(await locator.count()).toBeGreaterThanOrEqual(1);
      }

      {
        const locator = page.getByText("Bookings", { exact: true });
        expect(await locator.count()).toEqual(0);
      }

      const htmlLocator = page.locator("html");

      expect(await htmlLocator.getAttribute("lang")).toEqual("de");
      expect(await htmlLocator.getAttribute("dir")).toEqual("ltr");
    });

    await test.step("should reload the /bookings and show German translations", async () => {
      await page.reload();

      await page.waitForLoadState("networkidle");

      {
        const locator = page.getByText("Buchungen", { exact: true });
        expect(await locator.count()).toBeGreaterThanOrEqual(1);
      }

      {
        const locator = page.getByText("Bookings", { exact: true });
        expect(await locator.count()).toEqual(0);
      }

      const htmlLocator = page.locator("html");

      expect(await htmlLocator.getAttribute("lang")).toEqual("de");
      expect(await htmlLocator.getAttribute("dir")).toEqual("ltr");
    });
  });
});

test.describe("authorized user sees correct translations (ar)", async () => {
  test.use({
    locale: "en",
  });

  test("should return correct translations and html attributes", async ({ page, users }) => {
    await test.step("should create a de user", async () => {
      const user = await users.create({
        locale: "ar",
      });
      await user.apiLogin();
    });

    await test.step("should navigate to /event-types and show German translations", async () => {
      await page.goto("/event-types");

      await page.waitForLoadState("networkidle");

      {
        const locator = page.getByText("أنواع الحدث");
        expect(await locator.count()).toBeGreaterThanOrEqual(1);
      }

      {
        const locator = page.getByText("Event Types");
        expect(await locator.count()).toEqual(0);
      }

      const htmlLocator = page.locator("html");

      expect(await htmlLocator.getAttribute("lang")).toEqual("ar");
      expect(await htmlLocator.getAttribute("dir")).toEqual("rtl");
    });

    await test.step("should navigate to /bookings and show German translations", async () => {
      await page.goto("/bookings");

      await page.waitForLoadState("networkidle");

      {
        const locator = page.getByText("عمليات الحجز", { exact: true });
        expect(await locator.count()).toBeGreaterThanOrEqual(1);
      }

      {
        const locator = page.getByText("Bookings", { exact: true });
        expect(await locator.count()).toEqual(0);
      }

      const htmlLocator = page.locator("html");

      expect(await htmlLocator.getAttribute("lang")).toEqual("ar");
      expect(await htmlLocator.getAttribute("dir")).toEqual("rtl");
    });

    await test.step("should reload the /bookings and show German translations", async () => {
      await page.reload();

      await page.waitForLoadState("networkidle");

      {
        const locator = page.getByText("عمليات الحجز", { exact: true });
        expect(await locator.count()).toBeGreaterThanOrEqual(1);
      }

      {
        const locator = page.getByText("Bookings", { exact: true });
        expect(await locator.count()).toEqual(0);
      }

      const htmlLocator = page.locator("html");

      expect(await htmlLocator.getAttribute("lang")).toEqual("ar");
      expect(await htmlLocator.getAttribute("dir")).toEqual("rtl");
    });
  });
});

test.describe("authorized user sees changed translations (de->ar) [locale1]", async () => {
  test.use({
    locale: "en",
  });

  test("should return correct translations and html attributes", async ({ page, users }) => {
    await test.step("should create a de user", async () => {
      const user = await users.create({
        locale: "de",
      });
      await user.apiLogin();
    });

    await test.step("should change the language and show Arabic translations", async () => {
      await page.goto("/settings/my-account/general");

      await page.waitForLoadState("networkidle");

      await page.locator(".bg-default > div > div:nth-child(2)").first().click();
      await page.locator("#react-select-2-option-0").click();

      await page.getByRole("button", { name: "Aktualisieren" }).click();

      await page
        .getByRole("button", { name: "Einstellungen erfolgreich aktualisiert" })
        .waitFor({ state: "visible" });

      const htmlLocator = page.locator("html");

      expect(await htmlLocator.getAttribute("lang")).toEqual("ar");
      expect(await htmlLocator.getAttribute("dir")).toEqual("rtl");
    });
  });
});

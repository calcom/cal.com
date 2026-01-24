import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "serial" });

test.describe("unauthorized user sees correct translations (de)", async () => {
  test.use({
    locale: "de",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    // we dont need to wait for styles and images, only for dom
    await page.waitForLoadState("domcontentloaded");

    await page.locator("html[lang=de]").waitFor({ state: "attached" });
    await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

    {
      await page.waitForSelector("text=Willkommen zurück");
      const locator = page.getByText("Willkommen zurück", { exact: true });
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back", { exact: true });
      expect(await locator.count()).toEqual(0);
    }
  });
});

test.describe("unauthorized user sees correct translations (ar)", async () => {
  test.use({
    locale: "ar",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("html[lang=ar]").waitFor({ state: "attached" });
    await page.locator("html[dir=rtl]").waitFor({ state: "attached" });

    {
      await page.waitForSelector("text=أهلاً بك من جديد");
      const locator = page.getByText("أهلاً بك من جديد", { exact: true });
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back", { exact: true });
      expect(await locator.count()).toEqual(0);
    }
  });
});

test.describe("unauthorized user sees correct translations (zh)", async () => {
  test.use({
    locale: "zh",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("html[lang=zh]").waitFor({ state: "attached" });
    await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

    {
      await page.waitForSelector("text=欢迎回来");
      const locator = page.getByText("欢迎回来", { exact: true });
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back", { exact: true });
      expect(await locator.count()).toEqual(0);
    }
  });
});

test.describe("unauthorized user sees correct translations (zh-CN)", async () => {
  test.use({
    locale: "zh-CN",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("html[lang=zh-CN]").waitFor({ state: "attached" });
    await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

    {
      await page.waitForSelector("text=欢迎回来");
      const locator = page.getByText("欢迎回来", { exact: true });
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back", { exact: true });
      expect(await locator.count()).toEqual(0);
    }
  });
});

test.describe("unauthorized user sees correct translations (zh-TW)", async () => {
  test.use({
    locale: "zh-TW",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("html[lang=zh-TW]").waitFor({ state: "attached" });
    await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

    {
      await page.waitForSelector("text=歡迎回來");
      const locator = page.getByText("歡迎回來", { exact: true });
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back", { exact: true });
      expect(await locator.count()).toEqual(0);
    }
  });
});

test.describe("unauthorized user sees correct translations (pt)", async () => {
  test.use({
    locale: "pt",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("html[lang=pt]").waitFor({ state: "attached" });
    await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

    {
      await page.waitForSelector("text=Olá novamente");
      const locator = page.getByText("Olá novamente", { exact: true });
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back", { exact: true });
      expect(await locator.count()).toEqual(0);
    }
  });
});

test.describe("unauthorized user sees correct translations (pt-br)", async () => {
  test.use({
    locale: "pt-BR",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("html[lang=pt-BR]").waitFor({ state: "attached" });
    await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

    {
      await page.waitForSelector("text=Bem-vindo(a) novamente");
      const locator = page.getByText("Bem-vindo(a) novamente", { exact: true });
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back", { exact: true });
      expect(await locator.count()).toEqual(0);
    }
  });
});

test.describe("unauthorized user sees correct translations (es-419)", async () => {
  test.use({
    locale: "es",
  });

  test("should use correct translations and html attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // es-419 is disabled in i18n config, so es should be used as fallback
    await page.locator("html[lang=es]").waitFor({ state: "attached" });
    await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

    {
      await page.waitForSelector("text=Bienvenido de nuevo");
      const locator = page.getByText("Bienvenido de nuevo", { exact: true });
      expect(await locator.count()).toEqual(1);
    }

    {
      const locator = page.getByText("Welcome back", { exact: true });
      expect(await locator.count()).toEqual(0);
    }
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

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=de]").waitFor({ state: "attached" });
      await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

      {
        const locator = page.getByRole("heading", { name: "Ereignistypen", exact: true });
        // locator.count() does not wait for elements
        // but event-types page is client side, so it takes some time to render html
        // thats why we need to use method that awaits for the element
        // https://github.com/microsoft/playwright/issues/14278#issuecomment-1131754679
        await expect(locator).toHaveCount(1);
      }

      {
        const locator = page.getByText("Event Types", { exact: true });
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });

    await test.step("should navigate to /bookings and show German translations", async () => {
      await page.goto("/bookings");

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=de]").waitFor({ state: "attached" });
      await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

      {
        const locator = page.locator("h2", { hasText: "Es gibt noch keine bevorstehende Buchungen" });
        await expect(locator).toHaveCount(1);
      }

      {
        const locator = page.getByText("No upcoming bookings", { exact: true });
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });

    await test.step("should reload the /bookings and show German translations", async () => {
      await page.reload();

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=de]").waitFor({ state: "attached" });
      await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

      {
        const locator = page.locator("h2", { hasText: "Es gibt noch keine bevorstehende Buchungen" });
        await expect(locator).toHaveCount(1);
      }

      {
        const locator = page.getByText("No upcoming bookings", { exact: true });
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });
  });
});

test.describe("authorized user sees correct translations (pt-br)", async () => {
  test.use({
    locale: "en",
  });

  test("should return correct translations and html attributes", async ({ page, users }) => {
    await test.step("should create a pt-br user", async () => {
      const user = await users.create({
        locale: "pt-BR",
      });
      await user.apiLogin();
    });

    await test.step("should navigate to /event-types and show Brazil-Portuguese translations", async () => {
      await page.goto("/event-types");

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=pt-br]").waitFor({ state: "attached" });
      await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

      {
        const locator = page.getByRole("heading", { name: "Tipos de Eventos", exact: true });
        await expect(locator).toHaveCount(1);
      }

      {
        const locator = page.getByText("Event Types", { exact: true });
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });

    await test.step("should navigate to /bookings and show Brazil-Portuguese translations", async () => {
      await page.goto("/bookings");

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=pt-br]").waitFor({ state: "attached" });
      await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

      {
        const locator = page.locator("h2", { hasText: "Ainda não tem reservas próximos" });
        await expect(locator).toHaveCount(1);
      }

      {
        const locator = page.getByText("Bookings", { exact: true });
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });

    await test.step("should reload the /bookings and show Brazil-Portuguese translations", async () => {
      await page.reload();

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=pt-br]").waitFor({ state: "attached" });
      await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

      {
        const locator = page.locator("h2", { hasText: "Ainda não tem reservas próximos" });
        await expect(locator).toHaveCount(1);
      }

      {
        const locator = page.getByText("Bookings", { exact: true });
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
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

    await test.step("should navigate to /event-types and show Arabic translations", async () => {
      await page.goto("/event-types");

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=ar]").waitFor({ state: "attached" });
      await page.locator("html[dir=rtl]").waitFor({ state: "attached" });

      {
        const locator = page.getByRole("heading", { name: "أنواع الحدث", exact: true });
        await expect(locator).toHaveCount(1);
      }

      {
        const locator = page.getByText("Event Types", { exact: true });
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });

    await test.step("should navigate to /bookings and show Arabic translations", async () => {
      await page.goto("/bookings");

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=ar]").waitFor({ state: "attached" });
      await page.locator("html[dir=rtl]").waitFor({ state: "attached" });

      {
        const locator = page.locator("h2", { hasText: "لا توجد عمليات حجز القادم" });
        await expect(locator).toHaveCount(1);
      }

      {
        const locator = page.getByText("Bookings", { exact: true });
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });

    await test.step("should reload the /bookings and show Arabic translations", async () => {
      await page.reload();

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=ar]").waitFor({ state: "attached" });
      await page.locator("html[dir=rtl]").waitFor({ state: "attached" });

      {
        const locator = page.locator("h2", { hasText: "لا توجد عمليات حجز القادم" });
        await expect(locator).toHaveCount(1);
      }

      {
        const locator = page.getByText("Bookings", { exact: true });
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });
  });
});

test.describe("authorized user sees changed translations (de->ar)", async () => {
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

      await page.waitForLoadState("domcontentloaded");

      await page.locator(".bg-default > div > div:nth-child(2)").first().click();
      await page.getByTestId("select-option-ar").click();

      await submitAndWaitForResponse(page, "/api/trpc/me/updateProfile?batch=1", {
        action: () => page.click("[data-testid=general-submit-button]"),
      });

      await page.locator("html[lang=ar]").waitFor({ state: "attached" });
      await page.locator("html[dir=rtl]").waitFor({ state: "attached" });

      {
        // at least one is visible
        const locator = page.getByText("عام", { exact: true }).last(); // "general"
        await expect(locator).toBeVisible();
      }

      {
        const locator = page.getByText("Allgemein", { exact: true }); // "general"
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });

    await test.step("should reload and show Arabic translations", async () => {
      await page.reload();

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=ar]").waitFor({ state: "attached" });
      await page.locator("html[dir=rtl]").waitFor({ state: "attached" });

      {
        const locator = page.getByText("عام", { exact: true }).last(); // "general"
        await expect(locator).toBeVisible();
      }

      {
        const locator = page.getByText("Allgemein", { exact: true }); // "general"
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });
  });
});

test.describe("authorized user sees changed translations (de->pt-BR) [locale1]", async () => {
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

    await test.step("should change the language and show Brazil-Portuguese translations", async () => {
      await page.goto("/settings/my-account/general");
      await page.waitForLoadState("domcontentloaded");

      await page.locator(".bg-default > div > div:nth-child(2)").first().click();
      await page.locator("text=Português (Brasil)").click();

      await submitAndWaitForResponse(page, "/api/trpc/me/updateProfile?batch=1", {
        action: () => page.click("[data-testid=general-submit-button]"),
      });

      await page.locator("html[lang=pt-BR]").waitFor({ state: "attached" });
      await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

      {
        const locator = page.getByText("Geral", { exact: true }).last(); // "general"
        await expect(locator).toBeVisible();
      }

      {
        const locator = page.getByText("Allgemein", { exact: true }); // "general"
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });

    await test.step("should reload and show Brazil-Portuguese translations", async () => {
      await page.reload();

      await page.waitForLoadState("domcontentloaded");

      await page.locator("html[lang=pt-BR]").waitFor({ state: "attached" });
      await page.locator("html[dir=ltr]").waitFor({ state: "attached" });

      {
        const locator = page.getByText("Geral", { exact: true }).last(); // "general"
        await expect(locator).toBeVisible();
      }

      {
        const locator = page.getByText("Allgemein", { exact: true }); // "general"
        await expect(locator).toHaveCount(0, { timeout: 0 });
      }
    });
  });
});

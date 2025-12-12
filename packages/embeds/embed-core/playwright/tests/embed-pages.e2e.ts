import { expect } from "@playwright/test";

import { test } from "@calcom/web/playwright/lib/fixtures";

import "../../src/types";

test.describe("Embed Pages", () => {
  test("Event Type Page: should not have margin top on embed page", async ({ page }) => {
    await page.goto("http://localhost:3000/free/30min/embed");
    // Checks the margin from top by checking the distance between the div inside main from the viewport
    const marginFromTop = await page.evaluate(async () => {
      return await new Promise<{
        bookerContainer: number;
        mainEl: number;
      }>((resolve) => {
        (function tryGettingBoundingRect() {
          const mainElement = document.querySelector(".main");
          const bookerContainer = document.querySelector('[data-testid="booker-container"]');

          if (mainElement && bookerContainer) {
            // This returns the distance of the div element from the viewport
            const mainElBoundingRect = mainElement.getBoundingClientRect();
            const bookerContainerBoundingRect = bookerContainer.getBoundingClientRect();
            resolve({ bookerContainer: bookerContainerBoundingRect.top, mainEl: mainElBoundingRect.top });
          } else {
            setTimeout(tryGettingBoundingRect, 500);
          }
        })();
      });
    });

    expect(marginFromTop.bookerContainer).toBe(0);
    expect(marginFromTop.mainEl).toBe(0);
  });

  test("Event Type Page: should have margin top on non embed page", async ({ page }) => {
    await page.goto("http://localhost:3000/free/30min");

    // Checks the margin from top by checking the distance between the div inside main from the viewport
    const marginFromTop = await page.evaluate(() => {
      const mainElement = document.querySelector("main");
      const divElement = mainElement?.querySelector("div");

      if (mainElement && divElement) {
        // This returns the distance of the div element from the viewport
        const divRect = divElement.getBoundingClientRect();
        return divRect.top;
      }

      return null;
    });

    expect(marginFromTop).not.toBe(0);
  });

  test.describe("isEmbed, getEmbedNamespace, getEmbedTheme testing", () => {
    test("when `window.name` is set to 'cal-embed=' and `theme` is supplied as a query param", async ({
      page,
    }) => {
      const queryParamTheme = "dark";
      await page.evaluate(() => {
        window.name = "cal-embed=";
      });

      await page.goto(`http://localhost:3000/free/30min?theme=${queryParamTheme}`);

      const isEmbed = await page.evaluate(() => {
        return window?.isEmbed?.();
      });

      const embedNamespace = await page.evaluate(() => {
        return window?.getEmbedNamespace?.();
      });

      expect(embedNamespace).toBe("");
      expect(isEmbed).toBe(true);
      const embedTheme = await page.evaluate(() => {
        return window?.getEmbedTheme?.();
      });
      expect(embedTheme).toBe(queryParamTheme);
      const embedStoreTheme = await page.evaluate(() => {
        return window.CalEmbed.embedStore.theme;
      });
      // Verify that the theme is set on embedStore.
      expect(embedStoreTheme).toBe(queryParamTheme);
    });

    test("when `window.name` does not contain `cal-embed=`", async ({ page }) => {
      await page.evaluate(() => {
        window.name = "testing";
      });
      await page.goto(`http://localhost:3000/free/30min`);
      const isEmbed = await page.evaluate(() => {
        return window?.isEmbed?.();
      });
      const embedNamespace = await page.evaluate(() => {
        return window?.getEmbedNamespace?.();
      });
      expect(isEmbed).toBe(false);
      expect(embedNamespace).toBe(null);
    });

    test("`getEmbedTheme` should use `window.CalEmbed.embedStore.theme` instead of `theme` query param if set", async ({
      page,
    }) => {
      const theme = "dark";
      await page.evaluate(() => {
        window.name = "cal-embed=";
      });
      await page.goto("http://localhost:3000/free/30min?theme=dark");
      let embedTheme = await page.evaluate(() => {
        return window?.getEmbedTheme?.();
      });
      expect(embedTheme).toBe(theme);

      // Fake a scenario where theme query param is lost during navigation
      await page.evaluate(() => {
        history.pushState({}, "", "/free/30min");
      });

      embedTheme = await page.evaluate(() => {
        return window?.getEmbedTheme?.();
      });

      // Theme should still remain same as it's read from `window.CalEmbed.embedStore.theme` which is updated by getEmbedTheme itself
      expect(embedTheme).toBe(theme);
    });
  });

  test.describe("reservedSlotUid in request body", () => {
    test("embed booker sends reservedSlotUid in request body", async ({ page }) => {
      let bookingRequestBody: { reservedSlotUid: string | null } = { reservedSlotUid: null };

      page.on("request", (request) => {
        if (request.url().includes("/api/book/event") && request.method() === "POST") {
          bookingRequestBody = request.postDataJSON();
        }
      });

      await page.evaluate(() => {
        window.name = "cal-embed=";
      });

      await page.goto("http://localhost:3000/free/30min/embed");

      await page.waitForSelector('[data-testid="booker-container"]');

      await page.click('[data-testid="incrementMonth"]');
      await page.waitForSelector('[data-testid="day"][data-disabled="false"]');
      await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();

      await page.waitForSelector('[data-testid="time"]');
      await page.locator('[data-testid="time"]').nth(0).click();

      await page.fill('[name="name"]', "Test User Embed");
      await page.fill('[name="email"]', "test-embed@example.com");

      const responsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/book/event") && response.request().method() === "POST"
      );

      await page.locator('[data-testid="confirm-book-button"]').click();

      await responsePromise;

      await expect(page.locator("[data-testid=success-page]")).toBeVisible();

      expect(bookingRequestBody).toBeTruthy();
      expect(bookingRequestBody).toHaveProperty("reservedSlotUid");
      expect(typeof bookingRequestBody.reservedSlotUid).toBe("string");
      if (bookingRequestBody.reservedSlotUid) {
        expect(bookingRequestBody.reservedSlotUid.length).toBeGreaterThan(0);
      } else {
        throw new Error("reservedSlotUid is not set");
      }
    });

    test("embed booker sends reservedSlotUid in request body when rescheduling", async ({
      page,
      users,
      bookings,
      prisma,
    }) => {
      const pro = await users.create();
      const [eventType] = pro.eventTypes;
      const booking = await bookings.create(pro.id, pro.username, eventType.id);

      let bookingRequestBody: { reservedSlotUid: string | null } = { reservedSlotUid: null };
      let reservedSlotUidFromReserve: string | null = null;
      let reservedSlotUidFromBooking: string | null = null;

      page.on("request", (request) => {
        if (request.url().includes("/api/book/event") && request.method() === "POST") {
          const body = request.postDataJSON();
          bookingRequestBody = body;
          reservedSlotUidFromBooking = body?.reservedSlotUid ?? null;
        }
      });

      await page.evaluate(() => {
        window.name = "cal-embed=";
      });

      await page.goto(`http://localhost:3000/reschedule/${booking.uid}/embed`);

      await page.waitForSelector('[data-testid="booker-container"]');

      await page.click('[data-testid="incrementMonth"]');
      await page.waitForSelector('[data-testid="day"][data-disabled="false"]');
      await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();

      await page.waitForSelector('[data-testid="time"]');

      const reserveRespPromise = page.waitForResponse(
        (response) => response.url().includes("slots/reserveSlot") && response.request().method() === "POST"
      );

      await page.locator('[data-testid="time"]').nth(0).click();

      const reserveResp = await reserveRespPromise;
      const reserveJson = await reserveResp.json();
      const uidFromReserve =
        reserveJson?.result?.data?.json?.uid ??
        (Array.isArray(reserveJson) ? reserveJson[0]?.result?.data?.json?.uid : undefined);
      if (!uidFromReserve) {
        throw new Error("reserveSlot response did not contain a uid");
      }
      reservedSlotUidFromReserve = uidFromReserve;

      const preSelectedSlot = await prisma.selectedSlots.findFirst({ where: { uid: uidFromReserve } });
      expect(preSelectedSlot).not.toBeNull();

      const responsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/book/event") && response.request().method() === "POST"
      );

      await page.locator('[data-testid="confirm-reschedule-button"]').click();

      await responsePromise;

      await expect(page.locator("[data-testid=success-page]")).toBeVisible();

      expect(bookingRequestBody).toBeTruthy();
      expect(bookingRequestBody).toHaveProperty("reservedSlotUid");
      expect(typeof bookingRequestBody.reservedSlotUid).toBe("string");
      if (bookingRequestBody.reservedSlotUid) {
        expect(bookingRequestBody.reservedSlotUid.length).toBeGreaterThan(0);
        expect(reservedSlotUidFromBooking).toEqual(reservedSlotUidFromReserve);
        const selectedSlot = await prisma.selectedSlots.findFirst({
          where: { uid: bookingRequestBody.reservedSlotUid as string },
        });
        expect(selectedSlot).toBeNull();
      } else {
        throw new Error("reservedSlotUid is not set");
      }
    });
  });
});

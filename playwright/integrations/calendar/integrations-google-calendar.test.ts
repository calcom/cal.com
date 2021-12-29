import { expect, test } from "@playwright/test";

import { hasIntegrationInstalled } from "../../../lib/integrations/getIntegrations";

test.describe.serial("Google calendar integration", () => {
  test.skip(
    !hasIntegrationInstalled("google_calendar"),
    "It should only run if Google Calendar is installed"
  );

  test.describe.serial("Google Calendar integration dashboard", () => {
    test.use({ storageState: "playwright/artifacts/proStorageState.json" });
    test("Can add Google Calendar integration", async ({ browser }) => {
      const context = await browser.newContext({ locale: "en-US" });

      const page = await context.newPage();

      await page.goto("/integrations");

      page.waitForNavigation();

      /** We should see the "Connect" button for Google Calendar */
      expect(page.locator(`li:has-text("Google Calendar") >> [data-testid="integration-connection-button"]`))
        .toContainText("Connect")
        .catch(() => {
          console.error(
            `Make sure Google Calendar it's properly installed and that an integration hasn't been already added.`
          );
        });

      await Promise.all([
        page.waitForNavigation(/*{ url: 'https://accounts.google.com/o/oauth2/v2/auth/identifier?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&prompt=consent&state=%7B%22returnTo%22%3A%22%2Fintegrations%22%7D&response_type=code&client_id=807439123749-1pjdju71hol2tcmr4ce7h99a6p7bh4b4.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fintegrations%2Fgooglecalendar%2Fcallback&flowName=GeneralOAuthFlow' }*/),
        page.click(
          'text=Google CalendarFor personal and business calendarsConnect >> [data-testid="integration-connection-button"]'
        ),
      ]);

      /** We start the Stripe flow */
      await page.goto(
        "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&prompt=consent&state=%7B%22returnTo%22%3A%22%2Fintegrations%22%7D&response_type=code&client_id=807439123749-1pjdju71hol2tcmr4ce7h99a6p7bh4b4.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fintegrations%2Fgooglecalendar%2Fcallback"
      );

      await page.goto(
        "https://accounts.google.com/o/oauth2/v2/auth/identifier?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&prompt=consent&state=%7B%22returnTo%22%3A%22%2Fintegrations%22%7D&response_type=code&client_id=807439123749-1pjdju71hol2tcmr4ce7h99a6p7bh4b4.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fintegrations%2Fgooglecalendar%2Fcallback&flowName=GeneralOAuthFlow"
      );

      await page.click('[aria-label="Correo electrónico o teléfono"]');

      await page.fill('[aria-label="Correo electrónico o teléfono"]', "appstest647@gmail.com");

      await Promise.all([
        page.waitForNavigation(/*{ url: 'https://accounts.google.com/signin/v2/challenge/pwd?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&prompt=consent&state=%7B%22returnTo%22%3A%22%2Fintegrations%22%7D&response_type=code&client_id=807439123749-1pjdju71hol2tcmr4ce7h99a6p7bh4b4.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fintegrations%2Fgooglecalendar%2Fcallback&flowName=GeneralOAuthFlow&cid=1&navigationDirection=forward&TL=AM3QAYYRpKiZPgQ3OiJXVKpjvb7oI9B9onW6syFiJlBPLS_ADnrNniEXQL0TsTn-' }*/),
        page.click('button:has-text("Siguiente")'),
      ]);

      await page.click('[aria-label="Ingresa tu contraseña"]');

      await page.fill('[aria-label="Ingresa tu contraseña"]', "aW4TDL9GQ55_01");

      // Press Enter
      await Promise.all([
        page.waitForNavigation(/*{ url: 'https://accounts.google.com/signin/oauth/warning?authuser=0&part=AJi8hANmAtMQ-UhmjdCwpNNwGOIshO2BwRJhgAPWhuGd8ehakEoTJTx4KICzosVLmJv1CuUzvvyUHYvuEEKzo865V9i7sxDAf1ApvqopHYJUH4-6cTJhTV2B6pP8U-3v2gRMkEhFYzldGgnDZ3WHyWj3Nfg3TOgiRuS2k4KRoeLr-w__O2jrX8JYaLTMHiTghpWcE9WyPmaMPgLuzbFYat1Sne9BkIze5-AiWF1TsyBLr8uLcBN3pKk7y1eh6L4nlu0XKotZ1wnHgXsi06roHn1KK9yeo48-FwghsX2phheIp654vYc12SjELu0dsjWkXTpfj1X22Xc8fQK31xToqf0tdClmuOSDwEacQmgpZJlncChn7tVAopvTkO5v0wxkrGNy7wKQZMDffpvoCxDyV4ew4zNcT6DOn-oRU0ySiMwuOlZqutn23IcTKEdQiLp33JaacRY6JLQGoA86-InikC75xP9stBby6IZ8HmD_uCPdyaQslfMQWAQ&as=S1091477452%3A1640725683048124&client_id=807439123749-1pjdju71hol2tcmr4ce7h99a6p7bh4b4.apps.googleusercontent.com&rapt=AEjHL4PVP3TevMulM-iUTkKiZSr7x-vNMq4Z7tX2XChPaH99eCoXHrEe7rk2EpBMTKTb9ESEo0QDayW5BRFQLy8KALF3tdQXnw#' }*/),
        page.press('[aria-label="Ingresa tu contraseña"]', "Enter"),
      ]);

      // Click button:has-text("Continuar")
      await Promise.all([
        page.waitForNavigation(/*{ url: 'https://accounts.google.com/signin/oauth/v2/consentsummary?authuser=0&part=AJi8hANvD4yF7dFpqAflbW06NmSRziM4oeh0SM3zrURKqItAdML4h7BPLE8fQJTMIOkC2OHYFapOIn0YHuhFLSI3cVJ0Wvr1eTmnTNx1iX7XfGHBLCe-HzAfYUIHbAbhwhhUGGPBxryZKB92cLXFLVH-ZjFz2Nm2JALBdupdHsKuGMKw5-6AqV-cQqKK5EWtd46QBo2scRMa0DaV0OOBkWap47J7JbSVei8OqkKkenVaWgnZBKp94T7zL39YkxUsuQaHOr1SHdlZai083fRbD0YV5vBkyJZFfpnb-1J1V7D-uCRHloPubKKTzdLcggik0RvfYgbfY4PRJMmAF7rOjCne2ppYlkmitHbehQ7gSP-AIW1GY5t1b7w37ofvMSqhJn9ImEBCeksZO0iWQG9MyQGwnZZVviNr-5TBu8yZr5OeExBqG-wJpbmffM4RG5iSH1Jz1zK2pxS1iENSHiaGDA-vaqin2zOzzHZX1DTdz84CC7ILe_xLGnApTedaFhIgUdBt06ohnAWaqPY4mncmcPKW52TtqY4vAKAK4oE1tIo0d_cLSbQ9M2vk6CcSOeUtSaGj5_KqYpGGH2oFCyTJuwRhRFN8CzbGKG6bH267DAdhJLjHa6hvK5U3ACtrBm2J9PO4khSxwAVCMd0IQL2tTMdzOH3ZPFAfpTK0p5GTR_pHgtljgBOO1lZPXX8pXuAncTFKThy6hQ5z2lfXqQrTRNsNLMZ9Kyb0PIvF-TOVK6eNP1o76OPSJ1nHP690YJRbDaYFCxWBmtd76ar2mVxs4hn_OLMqFqYq9uzPrq6_dFSKtPXglFxJx85T7AILluOglIOqdfdhjpecxA4WzeFCJS7bOBFnasOHBySn2wvfJv_IFaLJTBv7CGUWq-ZyVROVflfipur6g7zZkBu5hvUJR7ZKTdv9vrvtUQ&hl=es&as=S1091477452%3A1640725683048124&client_id=807439123749-1pjdju71hol2tcmr4ce7h99a6p7bh4b4.apps.googleusercontent.com&rapt=AEjHL4PVP3TevMulM-iUTkKiZSr7x-vNMq4Z7tX2XChPaH99eCoXHrEe7rk2EpBMTKTb9ESEo0QDayW5BRFQLy8KALF3tdQXnw' }*/),
        page.click('button:has-text("Continuar")'),
      ]);

      // Click button:has-text("Continuar")
      await Promise.all([
        page.waitForNavigation(/*{ url: 'http://localhost:3000/integrations' }*/),
        page.click('button:has-text("Continuar")'),
      ]);

      page.waitForEvent("load");

      /** If Stripe is added correctly we should see the "Disconnect" button */
      expect(
        page.locator(
          `div:has-text("Calendars") + li:has-text("Google Calendar") >> [data-testid="integration-connection-button"]`
        )
      ).toContainText("Disconnect");
    });
  });
});

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Payment", () => {
  test.describe("user", () => {
    test.afterEach(async ({ users }) => {
      await users.deleteAll();
    });

    test("should create a mock payment for a user", async ({ users, page }) => {
      const user = await users.create();
      await user.apiLogin();
      await page.goto("/apps");

      await page.getByPlaceholder("Search").click();
      await page.getByPlaceholder("Search").fill("mock");

      await page.getByTestId("install-app-button").click();

      await page.waitForURL((url) => url.pathname.endsWith("/apps/installed/payment"));

      await page.getByRole("link", { name: "Event Types" }).click();

      await page.getByRole("link", { name: /^30 min/ }).click();
      await page.getByTestId("vertical-tab-apps").click();
      await page.locator("#event-type-form").getByRole("switch").click();
      await page.getByPlaceholder("Price").click();
      await page.getByPlaceholder("Price").fill("1");
      await page.locator(".text-black > .bg-default > div > .text-emphasis").click();
      await page.locator("#react-select-5-input").fill("usd");
      await page.getByTestId("select-option-USD").click();
      await page.getByTestId("update-eventtype").click();

      await page.goto(`${user.username}/30-min`);

      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: "10:00am" }).click();
      await page.getByTestId("confirm-book-button").click();

      await page.waitForURL((url) => url.pathname.includes("/payment/"));

      await page.getByText("Payment", { exact: true }).waitFor();
    });
  });
});

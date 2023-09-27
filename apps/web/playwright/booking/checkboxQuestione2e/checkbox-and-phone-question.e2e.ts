import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Question and Phone Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox and Phone required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "phone",
      "Test Checkbox question and phone question (both required)",
      bookingOptions
    );
  });

  test("Checkbox and Phone not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "phone",
      "Test Checkbox question and phone question (only checkbox required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

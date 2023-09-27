import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Question and Short text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "text",
      "Test Checkbox question and Short text question (both required)",
      bookingOptions
    );
  });

  test("Checkbox and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "text",
      "Test Checkbox question and Short text question (only checkbox required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Checkbox Question and Multi email Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Checkbox and Multi email required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "multiemail",
      "Test Checkbox question and Multi email question (both required)",
      bookingOptions
    );
  });

  test("Checkbox and Multi email not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "boolean",
      users,
      "multiemail",
      "Test Checkbox question and Multi email question (only checkbox required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

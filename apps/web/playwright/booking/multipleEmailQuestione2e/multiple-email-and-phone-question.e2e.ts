import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Multiple email Question and Phone Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multiple email and Phone required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "phone",
      "Test Multiple email question and Phone question (both required)",
      bookingOptions
    );
  });

  test("Multiple email and Phone not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "phone",
      "Test Multiple email question and Phone question (only Multi email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterAll(({ users }) => users.deleteAll());

test.describe("Booking With Multiple Email Question and Short text question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Multiple Email and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "text",
      "Test Multiple Email question and Short Text question (both required)",
      bookingOptions
    );
  });

  test("Multiple Email and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "multiemail",
      users,
      "text",
      "Test Multiple Email question and Short Text question (only multiple email required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

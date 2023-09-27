import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Select Question and Short text question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Select and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "text",
      "Test Select question and Short Text question (both required)",
      bookingOptions
    );
  });

  test("Select and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "select",
      users,
      "text",
      "Test Select question and Short Text question (only select required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Long Text Question and Short text question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Long Text and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "text",
      "Test Long Text question and Short Text question (both required)",
      bookingOptions
    );
  });

  test("Long Text and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "text",
      "Test Long Text question and Short Text question (only long text required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

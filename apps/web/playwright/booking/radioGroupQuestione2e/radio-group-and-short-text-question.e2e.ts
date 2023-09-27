import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Radio Group Question and Short text question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Radio Group and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "text",
      "Test Radio Group question and Short Text question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "text",
      "Test Radio Group question and Short Text question (only radio required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

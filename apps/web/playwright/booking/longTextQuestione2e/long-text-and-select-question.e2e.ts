import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Long Text Question and select Question", () => {
  const bookingOptions = {
    hasPlaceholder: false,
    isRequired: true,
  };
  test("Long Text and select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "select",
      "Test Long Text question and select question (both required)",
      bookingOptions
    );
  });

  test("Long Text and select not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "textarea",
      users,
      "select",
      "Test Long Text question and select question (only long text required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

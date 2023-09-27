import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Radio Group Question and Multi email Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Radio Group and Multi email required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "multiemail",
      "Test Radio Group question and Multi email question (both required)",
      bookingOptions
    );
  });

  test("Radio Group and Multi email not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "radio",
      users,
      "multiemail",
      "Test Radio Group question and Multi email question (only radio required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

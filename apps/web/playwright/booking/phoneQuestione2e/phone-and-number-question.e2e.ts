import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and Address Question", () => {
  test("Phone and Number required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "number",
      true,
      true,
      "Test Phone question and number question (both required)"
    );
  });

  test("Phone and Number not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "number",
      true,
      false,
      "Test Phone question and number question (only phone required)"
    );
  });
});

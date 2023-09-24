import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and select Question", () => {
  test("Phone and select required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "select",
      false,
      true,
      "Test Phone question and select question (both required)",
      false,
      false,
      false,
      true
    );
  });
  test("Phone and select not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "select",
      false,
      false,
      "Test Phone question and select question (both required)"
    );
  });
});

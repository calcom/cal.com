import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and Address Question", () => {
  test("Phone and Multi email required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "multiemail",
      true,
      true,
      "Test Phone question and number question (both required)",
      false,
      false,
      true
    );
  });

  test("Phone and Multi email not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "multiemail",
      true,
      false,
      "Test Phone question and number question (only phone required)",
      false,
      false,
      true
    );
  });
});

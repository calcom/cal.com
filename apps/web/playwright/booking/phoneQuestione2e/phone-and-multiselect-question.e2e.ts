import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and multiselect Question", () => {
  test("Phone and multiselect text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "multiselect",
      false,
      true,
      "Test Phone question and multiselect question (both required)",
      false,
      false,
      false,
      true
    );
  });

  test("Phone and multiselect text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "multiselect",
      false,
      false,
      "Test Phone question and multiselect question (only phone required)",
      true,
      false,
      false,
      true
    );
  });
});

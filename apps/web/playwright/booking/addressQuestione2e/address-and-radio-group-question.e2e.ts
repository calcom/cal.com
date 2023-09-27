import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Address Question and Radio group Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Address and Radio group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "radio",
      "Test Address question and Radio group question (both required)",
      bookingOptions
    );
  });

  test("Address and Radio group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "radio",
      "Test Address question and Radio group question (only address required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

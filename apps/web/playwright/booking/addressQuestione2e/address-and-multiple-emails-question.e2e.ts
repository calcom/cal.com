import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Address Question and Multi email Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };
  test("Addres and Multi email required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "multiemail",
      "Test Address question and Multi email question (both required)",
      bookingOptions
    );
  });

  test("Addres and Multi email not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "multiemail",
      "Test Address question and Multi email question (only phone required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});

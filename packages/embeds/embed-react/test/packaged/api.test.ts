/**
 * @fileoverview
 * This file tests two things in 2 ways
 * - It is a vitest test file and thus it tests if the code executes without any error. Thus, it tests that package.json->main/module fields are correctly defined. It obviously verifies the assertions as well.
 * - It is also validates for it's types and thus verifies that @calcom/embed-react has correctly specified it's types in package.json->types field.
 */
import { expect, test } from "vitest";

// This import may show up as an error in your IDE, but it's fine because typings are available only after embed-react is built.
import { getCalApi } from "@calcom/embed-react";

const api = getCalApi();

test("Check that the API is available", async () => {
  expect(api).toBeDefined();
  const awaitedApi = await api;
  awaitedApi("floatingButton", {
    calLink: "free",
    config: {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error We are intentionaly testing invalid value
      layout: "wrongview",
    },
  });
});

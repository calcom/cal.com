import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test("add workflow with booking created trigger & test that booking an event triggers the workflow", async ({
  page,
  users,
}) => {
  const user = await users.create();
  const [eventType] = user.eventTypes;
  await user.login();
  await page.goto(`/workflows`);

  await page.click('[data-testid="create-button"]');

  // select first event type
  await page.getByText("Select...").click();
  await page.getByText(eventType.title, { exact: true }).click();

  // name workflow
  await page.fill('[data-testid="workflow-name"]', "Test workflow");

  // select when event is booked trigger
  await page.locator("#trigger-select").click();
  await page.getByText("When new event is booked", { exact: true }).click();

  // save workflow
  await page.click('[data-testid="save-workflow"]');

  await expect(page.locator('[data-testid="workflow-list"] > li')).toHaveCount(1);

  // todo: book event type

  // todo: check if workflow triggered
});

// Other possible tests:
// admin can create and update team workflow, member can not update team workflow

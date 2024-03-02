import type { Locator } from "@playwright/test";
import { expect, type Page } from "@playwright/test";

import prisma from "@calcom/prisma";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";

import { localize } from "../lib/testUtils";

type CreateWorkflowProps = {
  name?: string;
  isTeam?: true;
  trigger?: WorkflowTriggerEvents;
};

export function createWorkflowPageFixture(page: Page) {
  const createWorkflow = async (props: CreateWorkflowProps) => {
    const { name, isTeam, trigger } = props;
    if (isTeam) {
      await page.getByTestId("create-button-dropdown").click();
      await page.getByTestId("option-team-1").click();
    } else {
      await page.getByTestId("create-button").click();
    }
    if (name) {
      await fillNameInput(name);
    }
    if (trigger) {
      page.locator("div").filter({ hasText: WorkflowTriggerEvents.BEFORE_EVENT }).nth(1);
      page.getByText(trigger);
      await selectEventType("30 min");
    }
    await saveWorkflow();
  };

  const saveWorkflow = async () => {
    await page.getByTestId("save-workflow").click();
  };

  const assertListCount = async (count: number) => {
    const workflowListCount = await page.locator('[data-testid="workflow-list"] > li');
    await expect(workflowListCount).toHaveCount(count);
  };

  const fillNameInput = async (name: string) => {
    await page.getByTestId("workflow-name").fill(name);
  };

  const editSelectedWorkflow = async (name: string) => {
    const selectedWorkflow = page.getByTestId("workflow-list").getByTestId(nameToTestId(name));
    const editButton = selectedWorkflow.getByRole("button").nth(0);

    await editButton.click();
  };

  const hasWorkflowInList = async (name: string, negate?: true) => {
    const selectedWorkflow = page.getByTestId("workflow-list").getByTestId(nameToTestId(name));

    if (negate) {
      await expect(selectedWorkflow).toBeHidden();
    } else {
      await expect(selectedWorkflow).toBeVisible();
    }
  };

  const deleteAndConfirm = async (workflow: Locator) => {
    const deleteButton = workflow.getByTestId("delete-button");
    const confirmDeleteText = (await localize("en"))("confirm_delete_workflow");

    await deleteButton.click();
    await page.getByRole("button", { name: confirmDeleteText }).click();
  };

  const selectEventType = async (name: string) => {
    await page.getByText("Select...").click();
    await page.getByText(name, { exact: true }).click();
  };

  const hasReadonlyBadge = async () => {
    const readOnlyBadge = page.getByText((await localize("en"))("readonly"));
    await expect(readOnlyBadge).toBeVisible();
  };

  const selectedWorkflowPage = async (name: string) => {
    await page.getByTestId("workflow-list").getByTestId(nameToTestId(name)).click();
  };

  const workflowOptionsAreDisabled = async (workflow: string, negate?: boolean) => {
    const getWorkflowButton = async (buttonTestId: string) =>
      page.getByTestId(nameToTestId(workflow)).getByTestId(buttonTestId);
    const [editButton, deleteButton] = await Promise.all([
      getWorkflowButton("edit-button"),
      getWorkflowButton("delete-button"),
    ]);

    expect(editButton.isDisabled()).toBeTruthy();
    expect(deleteButton.isDisabled()).toBeTruthy();
  };

  const assertWorkflowReminders = async (eventTypeId: number, count: number) => {
    const booking = await prisma.booking.findFirst({
      where: {
        eventTypeId,
      },
    });
    const workflowReminders = await prisma.workflowReminder.findMany({
      where: {
        bookingUid: booking?.uid ?? "",
      },
    });
    expect(workflowReminders).toHaveLength(count);
  };

  function nameToTestId(name: string) {
    return `workflow-${name.split(" ").join("-").toLowerCase()}`;
  }

  return {
    createWorkflow,
    saveWorkflow,
    assertListCount,
    fillNameInput,
    editSelectedWorkflow,
    hasWorkflowInList,
    deleteAndConfirm,
    selectEventType,
    hasReadonlyBadge,
    selectedWorkflowPage,
    workflowOptionsAreDisabled,
    assertWorkflowReminders,
  };
}

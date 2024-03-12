import { MembershipRole, WorkflowTriggerEvents } from "@calcom/prisma/enums";

import { loginUser, loginUserWithTeam } from "./fixtures/regularBookings";
import { test } from "./lib/fixtures";
import { bookEventOnThisPage } from "./lib/testUtils";

test.describe("Workflow Tab - Event Type", () => {
  test.describe("Check the functionalities of the Workflow Tab", () => {
    test.describe("User Workflows", () => {
      test.beforeEach(async ({ page, users }) => {
        await loginUser(users);
        await page.goto("/workflows");
      });

      test("Creating a new workflow", async ({ workflowPage }) => {
        const { createWorkflow, assertListCount } = workflowPage;

        await createWorkflow({ name: "" });
        await assertListCount(3);
      });

      test("Editing an existing workflow", async ({ workflowPage }) => {
        const { saveWorkflow, fillNameInput, editSelectedWorkflow, hasWorkflowInList } = workflowPage;

        await editSelectedWorkflow("Test Workflow");
        await fillNameInput("Edited Workflow");
        await saveWorkflow();
        await hasWorkflowInList("Edited Workflow");
      });

      test("Deleting an existing workflow", async ({ page, workflowPage }) => {
        const { hasWorkflowInList, deleteAndConfirm, assertListCount } = workflowPage;
        const firstWorkflow = page
          .getByTestId("workflow-list")
          .getByTestId(/workflow/)
          .first();

        await deleteAndConfirm(firstWorkflow);
        await hasWorkflowInList("Edited Workflow", true);
        await assertListCount(1);
      });

      test("Create an action and check if workflow is triggered", async ({ page, users, workflowPage }) => {
        const { createWorkflow, assertWorkflowReminders } = workflowPage;
        const [user] = users.get();
        const [eventType] = user.eventTypes;

        await createWorkflow({ name: "A New Workflow", trigger: WorkflowTriggerEvents.NEW_EVENT });
        await page.goto(`/${user.username}/${eventType.slug}`);
        await page.click('[data-testid="incrementMonth"]');
        await bookEventOnThisPage(page);
        await assertWorkflowReminders(eventType.id, 1);
      });
    });

    test.describe("Team Workflows", () => {
      test("Admin user", async ({ page, users, workflowPage }) => {
        const { createWorkflow, assertListCount } = workflowPage;

        await loginUserWithTeam(users, MembershipRole.ADMIN);
        await page.goto("/workflows");

        await createWorkflow({ name: "A New Workflow", isTeam: true });
        await assertListCount(4);
      });

      test("Member user", async ({ page, users, workflowPage }) => {
        const { hasReadonlyBadge, selectedWorkflowPage, workflowOptionsAreDisabled } = workflowPage;

        await loginUserWithTeam(users, MembershipRole.MEMBER);
        await page.goto("/workflows");

        await workflowOptionsAreDisabled("Team Workflow");
        await selectedWorkflowPage("Team Workflow");
        await hasReadonlyBadge();
      });
    });
  });
});

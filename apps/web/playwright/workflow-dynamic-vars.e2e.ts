import { expect } from "@playwright/test";
import { MembershipRole } from "@calcom/prisma/enums";
import { loginUserWithTeam } from "./fixtures/regularBookings";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Workflow Dynamic Variables - Paid Plan Features", () => {
  test.beforeEach(async ({ page, users }) => {
    await loginUserWithTeam(users, MembershipRole.ADMIN);
    await page.goto("/workflows");
  });

  test("add variable dropdown is visible for email subject", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Dynamic Vars Test Workflow", isTeam: true });
    await editSelectedWorkflow("Dynamic Vars Test Workflow");
    await page.waitForLoadState("networkidle");

    // Paid users should see the Add Variable dropdown
    const addVariableDropdowns = page.locator('[aria-label="Add variable"]');
    await expect(addVariableDropdowns.first()).toBeVisible();
  });

  test("email subject textarea is enabled for editing", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Email Subject Test Workflow", isTeam: true });
    await editSelectedWorkflow("Email Subject Test Workflow");
    await page.waitForLoadState("networkidle");

    const emailSubjectLabel = page.getByText("Email subject");
    await expect(emailSubjectLabel).toBeVisible();

    const emailSubjectTextarea = page.locator("textarea").first();
    await expect(emailSubjectTextarea).toBeEnabled();
  });

  test("editor toolbar has add variable button", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Editor Toolbar Test Workflow", isTeam: true });
    await editSelectedWorkflow("Editor Toolbar Test Workflow");
    await page.waitForLoadState("networkidle");

    const editorToolbarAddVariable = page.locator('[aria-label="Add variable"]');
    await expect(editorToolbarAddVariable.first()).toBeVisible();
  });

  test("email body editor is editable", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Editor Editable Test Workflow", isTeam: true });
    await editSelectedWorkflow("Editor Editable Test Workflow");
    await page.waitForLoadState("networkidle");

    const editorContainer = page.locator("[data-lexical-editor]").first();
    await expect(editorContainer).toBeVisible();

    const contentEditable = await editorContainer.getAttribute("contenteditable");
    expect(contentEditable).toBe("true");
  });

  test("can open add variable dropdown and see dynamic variables", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Variable Dropdown Test Workflow", isTeam: true });
    await editSelectedWorkflow("Variable Dropdown Test Workflow");
    await page.waitForLoadState("networkidle");

    const addVariableButton = page.locator('[aria-label="Add variable"]').first();
    await addVariableButton.click();

    await expect(page.getByText("{ORGANIZER_NAME}")).toBeVisible();
    await expect(page.getByPlaceholder(/search variables/i)).toBeVisible();
  });

  test("can insert dynamic variable from dropdown", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Variable Insert Test Workflow", isTeam: true });
    await editSelectedWorkflow("Variable Insert Test Workflow");
    await page.waitForLoadState("networkidle");

    const addVariableButton = page.locator('[aria-label="Add variable"]').first();
    await addVariableButton.click();

    const variableOption = page.getByText("{ORGANIZER_NAME}");
    await expect(variableOption).toBeVisible();

    await variableOption.click();
    await expect(variableOption).not.toBeVisible();
  });
});

test.describe("Workflow Dynamic Variables - Free Plan Users", () => {
  test.beforeEach(async ({ page, users, prisma }) => {
    const freeUser = await users.create({ name: "freeuser" });
    await prisma.user.update({
      where: { id: freeUser.id },
      data: { metadata: { forceFree: true } },
    });
    await freeUser.apiLogin();
    await page.goto("/workflows");
  });

  test("add variable dropdown is NOT visible for email subject", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Free User Workflow" });
    await editSelectedWorkflow("Free User Workflow");
    await page.waitForLoadState("networkidle");

    // Free users should NOT see the Add Variable dropdown
    const addVariableDropdowns = page.locator('[aria-label="Add variable"]');
    await expect(addVariableDropdowns).toBeHidden();
  });

  test("email subject textarea is disabled", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Free User Subject Workflow" });
    await editSelectedWorkflow("Free User Subject Workflow");
    await page.waitForLoadState("networkidle");

    const emailSubjectLabel = page.getByText("Email subject");
    await expect(emailSubjectLabel).toBeVisible();

    const emailSubjectTextarea = page.locator("textarea").first();
    await expect(emailSubjectTextarea).toBeDisabled();
  });

  test("editor toolbar does NOT have add variable button", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Free User Toolbar Workflow" });
    await editSelectedWorkflow("Free User Toolbar Workflow");
    await page.waitForLoadState("networkidle");

    const editorToolbarAddVariable = page.locator('[aria-label="Add variable"]');
    await expect(editorToolbarAddVariable).toBeHidden();
  });

  test("email body editor is NOT editable", async ({ page, workflowPage }) => {
    const { createWorkflow, editSelectedWorkflow } = workflowPage;

    await createWorkflow({ name: "Free User Editor Workflow" });
    await editSelectedWorkflow("Free User Editor Workflow");
    await page.waitForLoadState("networkidle");

    const editorContainer = page.locator("[data-lexical-editor]").first();
    await expect(editorContainer).toBeVisible();

    const contentEditable = await editorContainer.getAttribute("contenteditable");
    expect(contentEditable).toBe("false");
  });
});
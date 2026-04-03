import "dotenv/config";

import { prisma } from "@calcom/prisma";
import { WorkflowTriggerEvents, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";

const FORM_TRIGGERS = new Set<WorkflowTriggerEvents>([
  WorkflowTriggerEvents.FORM_SUBMITTED,
  WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
]);

function getActionForTrigger(trigger: WorkflowTriggerEvents): WorkflowActions {
  // Form triggers send to submitted email address; all booking triggers send to attendee
  return FORM_TRIGGERS.has(trigger) ? WorkflowActions.EMAIL_ADDRESS : WorkflowActions.EMAIL_ATTENDEE;
}

async function seedWorkflowsForUser(userId: number, eventTypeIds: number[]) {
  const allTriggers = Object.values(WorkflowTriggerEvents);

  const existingWorkflow = await prisma.workflow.findFirst({
    where: { userId, name: { startsWith: "Seeded Workflow -" } },
  });

  if (existingWorkflow) {
    console.log("User workflows already seeded, skipping");
    return;
  }

  console.log(`Creating ${allTriggers.length} user workflows...`);
  for (const trigger of allTriggers) {
    const workflow = await prisma.workflow.create({
      data: {
        name: `Seeded Workflow - ${trigger}`,
        userId,
        trigger,
        isActiveOnAll: true,
        time:
          trigger === WorkflowTriggerEvents.BEFORE_EVENT
            ? 24
            : trigger === WorkflowTriggerEvents.AFTER_EVENT
              ? 1
              : null,
        timeUnit:
          trigger === WorkflowTriggerEvents.BEFORE_EVENT
            ? "HOUR"
            : trigger === WorkflowTriggerEvents.AFTER_EVENT
              ? "HOUR"
              : null,
        steps: {
          create: {
            stepNumber: 1,
            action: getActionForTrigger(trigger),
            template: WorkflowTemplates.REMINDER,
            emailSubject: `Seeded ${trigger} notification`,
            reminderBody: `This is a seeded workflow reminder for trigger: ${trigger}`,
            numberRequired: null,
            ...(FORM_TRIGGERS.has(trigger) ? { sendTo: "owner1-acme@example.com" } : {}),
          },
        },
        activeOn: {
          create: eventTypeIds.map((id) => ({ eventTypeId: id })),
        },
      },
    });
    console.log(`  Created: ${workflow.name} (id: ${workflow.id})`);
  }
}

async function seedWorkflowsForTeam(teamId: number, eventTypeIds: number[]) {
  const allTriggers = Object.values(WorkflowTriggerEvents);

  const existingWorkflow = await prisma.workflow.findFirst({
    where: { teamId, name: { startsWith: "Seeded Team Workflow -" } },
  });

  if (existingWorkflow) {
    console.log("Team workflows already seeded, skipping");
    return;
  }

  console.log(`Creating ${allTriggers.length} team workflows for teamId ${teamId}...`);
  for (const trigger of allTriggers) {
    const workflow = await prisma.workflow.create({
      data: {
        name: `Seeded Team Workflow - ${trigger}`,
        teamId,
        trigger,
        isActiveOnAll: true,
        time:
          trigger === WorkflowTriggerEvents.BEFORE_EVENT
            ? 24
            : trigger === WorkflowTriggerEvents.AFTER_EVENT
              ? 1
              : null,
        timeUnit:
          trigger === WorkflowTriggerEvents.BEFORE_EVENT
            ? "HOUR"
            : trigger === WorkflowTriggerEvents.AFTER_EVENT
              ? "HOUR"
              : null,
        steps: {
          create: {
            stepNumber: 1,
            action: getActionForTrigger(trigger),
            template: WorkflowTemplates.REMINDER,
            emailSubject: `Seeded team ${trigger} notification`,
            reminderBody: `This is a seeded team workflow reminder for trigger: ${trigger}`,
            numberRequired: null,
            ...(FORM_TRIGGERS.has(trigger) ? { sendTo: "owner1-acme@example.com" } : {}),
          },
        },
        activeOn: {
          create: eventTypeIds.map((id) => ({ eventTypeId: id })),
        },
      },
    });
    console.log(`  Created: ${workflow.name} (id: ${workflow.id})`);
  }
}

async function seedRoutingFormForUser(userId: number) {
  const formId = "a1b2c3d4-seed-owner1-routing-form";
  const existing = await prisma.app_RoutingForms_Form.findUnique({
    where: { id: formId },
  });

  if (existing) {
    console.log("Routing form for owner1 already seeded, skipping");
    return;
  }

  const selectFieldId = "rf-owner1-field-select-001";

  await prisma.app_RoutingForms_Form.create({
    data: {
      id: formId,
      name: "Seeded Routing Form - Owner1",
      userId,
      fields: [
        {
          id: "rf-owner1-field-text-001",
          type: "text",
          label: "What is your inquiry about?",
          required: true,
        },
        {
          id: selectFieldId,
          type: "select",
          label: "Department",
          required: true,
          options: [
            { id: "opt-sales", label: "Sales" },
            { id: "opt-support", label: "Support" },
            { id: "opt-billing", label: "Billing" },
          ],
        },
        {
          id: "rf-owner1-field-phone-001",
          type: "phone",
          label: "Phone Number",
          required: false,
        },
        {
          id: "rf-owner1-field-email-001",
          type: "email",
          label: "Email Address",
          required: true,
        },
      ],
      routes: [
        {
          id: "route-owner1-sales",
          action: { type: "eventTypeRedirectUrl", value: "owner1/30min" },
          queryValue: {
            id: "route-owner1-sales",
            type: "group",
            children1: {
              "rule-sales-001": {
                type: "rule",
                properties: {
                  field: selectFieldId,
                  value: ["Sales"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
        {
          id: "route-owner1-support",
          action: {
            type: "customPageMessage",
            value: "Thank you! A support agent will contact you shortly.",
          },
          queryValue: {
            id: "route-owner1-support",
            type: "group",
            children1: {
              "rule-support-001": {
                type: "rule",
                properties: {
                  field: selectFieldId,
                  value: ["Support"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
        {
          id: "route-owner1-billing",
          action: { type: "externalRedirectUrl", value: "https://cal.com/billing" },
          queryValue: {
            id: "route-owner1-billing",
            type: "group",
            children1: {
              "rule-billing-001": {
                type: "rule",
                properties: {
                  field: selectFieldId,
                  value: ["Billing"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
        {
          id: "route-owner1-fallback",
          action: { type: "customPageMessage", value: "Thank you for your submission!" },
          isFallback: true,
          queryValue: {
            id: "route-owner1-fallback",
            type: "group",
          },
        },
      ],
    },
  });
  console.log("Created routing form for owner1");
}

async function seedRoutingFormForTeam(userId: number, teamId: number) {
  const formId = "b2c3d4e5-seed-team-routing-form-01";
  const existing = await prisma.app_RoutingForms_Form.findUnique({
    where: { id: formId },
  });

  if (existing) {
    console.log("Team routing form already seeded, skipping");
    return;
  }

  const selectFieldId = "rf-team-field-select-001";

  await prisma.app_RoutingForms_Form.create({
    data: {
      id: formId,
      name: "Seeded Team Routing Form",
      userId,
      teamId,
      fields: [
        {
          id: "rf-team-field-text-001",
          type: "text",
          label: "Company Name",
          required: true,
        },
        {
          id: selectFieldId,
          type: "select",
          label: "Meeting Type",
          required: true,
          options: [
            { id: "opt-demo", label: "Product Demo" },
            { id: "opt-consultation", label: "Consultation" },
            { id: "opt-followup", label: "Follow-up" },
          ],
        },
        {
          id: "rf-team-field-number-001",
          type: "number",
          label: "Team Size",
          required: false,
        },
        {
          id: "rf-team-field-multi-001",
          type: "multiselect",
          label: "Topics of Interest",
          required: false,
          options: [
            { id: "opt-pricing", label: "Pricing" },
            { id: "opt-features", label: "Features" },
            { id: "opt-integration", label: "Integration" },
            { id: "opt-security", label: "Security" },
          ],
        },
      ],
      routes: [
        {
          id: "route-team-demo",
          action: { type: "eventTypeRedirectUrl", value: "team/team1-event-1" },
          queryValue: {
            id: "route-team-demo",
            type: "group",
            children1: {
              "rule-demo-001": {
                type: "rule",
                properties: {
                  field: selectFieldId,
                  value: ["Product Demo"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
        {
          id: "route-team-consultation",
          action: { type: "eventTypeRedirectUrl", value: "team/team1-event-1" },
          queryValue: {
            id: "route-team-consultation",
            type: "group",
            children1: {
              "rule-consultation-001": {
                type: "rule",
                properties: {
                  field: selectFieldId,
                  value: ["Consultation"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
        {
          id: "route-team-followup",
          action: {
            type: "customPageMessage",
            value: "A team member will reach out to schedule your follow-up.",
          },
          queryValue: {
            id: "route-team-followup",
            type: "group",
            children1: {
              "rule-followup-001": {
                type: "rule",
                properties: {
                  field: selectFieldId,
                  value: ["Follow-up"],
                  operator: "equal",
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
        },
        {
          id: "route-team-fallback",
          action: { type: "customPageMessage", value: "Thanks! We will get back to you soon." },
          isFallback: true,
          queryValue: {
            id: "route-team-fallback",
            type: "group",
          },
        },
      ],
    },
  });
  console.log("Created team routing form");
}

async function main() {
  console.log("\n=== Seeding Workflows and Routing Forms ===");

  // Find owner1-acme user
  const owner1 = await prisma.user.findFirst({
    where: { email: "owner1-acme@example.com" },
  });

  if (!owner1) {
    console.log("owner1-acme user not found. Run the main seed first.");
    return;
  }

  // Find Acme org
  const acmeOrg = await prisma.team.findFirst({
    where: { slug: "acme", parentId: null },
    select: { id: true },
  });

  if (!acmeOrg) {
    console.log("Acme org not found. Run the main seed first.");
    return;
  }

  // Find team1 under Acme org
  const acmeTeam = await prisma.team.findFirst({
    where: { slug: "team1", parentId: acmeOrg.id },
    select: { id: true },
  });

  if (!acmeTeam) {
    console.log("Acme team1 not found. Run the main seed first.");
    return;
  }

  const teamId = acmeTeam.id;

  // Get event types for owner1
  const owner1EventTypes = await prisma.eventType.findMany({
    where: { userId: owner1.id },
    select: { id: true },
  });
  console.log(`Found ${owner1EventTypes.length} event types for owner1`);

  // Get event types for the team
  const teamEventTypes = await prisma.eventType.findMany({
    where: { teamId },
    select: { id: true },
  });
  console.log(`Found ${teamEventTypes.length} event types for teamId ${teamId}`);

  // Seed user workflows
  await seedWorkflowsForUser(
    owner1.id,
    owner1EventTypes.map((et) => et.id)
  );

  // Seed team workflows
  await seedWorkflowsForTeam(
    teamId,
    teamEventTypes.map((et) => et.id)
  );

  // Seed routing form for owner1
  await seedRoutingFormForUser(owner1.id);

  // Seed team routing form
  await seedRoutingFormForTeam(owner1.id, teamId);

  console.log("=== Workflow and Routing Form seeding complete ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

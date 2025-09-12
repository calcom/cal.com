import type { MigrationContext } from "../types";

export async function migrateCalIdWorkflows(ctx: MigrationContext) {
  ctx.log("Migrating Workflow → CalIdWorkflow...");

  const oldWorkflows = await ctx.oldDb.workflow.findMany({
    include: {
      steps: true,
    },
  });

  await ctx.processBatch(oldWorkflows, async (batch) => {
    const newWorkflows = await Promise.all(
      batch.map(async (oldWorkflow: any) => {
        try {
          const userId = oldWorkflow.userId ? ctx.idMappings.users[oldWorkflow.userId.toString()] : null;
          const calIdTeamId = oldWorkflow.teamId
            ? ctx.idMappings.calIdTeams[oldWorkflow.teamId.toString()]
            : null;

          const newWorkflow = await ctx.newDb.calIdWorkflow.create({
            data: {
              position: oldWorkflow.position,
              name: oldWorkflow.name,
              userId: userId,
              calIdTeamId: calIdTeamId,
              isActiveOnAll: oldWorkflow.isActiveOnAll,
              trigger: oldWorkflow.trigger,
              time: oldWorkflow.time,
              timeUnit: oldWorkflow.timeUnit,
              disabled: false,
            },
          });

          ctx.idMappings.calIdWorkflows[oldWorkflow.id.toString()] = newWorkflow.id;
          return newWorkflow;
        } catch (error) {
          ctx.logError(`Failed to migrate workflow ${oldWorkflow.id}`, error);
          return null;
        }
      })
    );
    return newWorkflows.filter(Boolean);
  });

  ctx.log(`Migrated ${oldWorkflows.length} workflows to CalIdWorkflows`);
}

export async function migrateCalIdWorkflowSteps(ctx: MigrationContext) {
  ctx.log("Migrating WorkflowStep → CalIdWorkflowStep...");

  const oldSteps = await ctx.oldDb.workflowStep.findMany();

  await ctx.processBatch(oldSteps, async (batch) => {
    const newSteps = await Promise.all(
      batch.map(async (oldStep: any) => {
        try {
          const calIdWorkflowId = ctx.idMappings.calIdWorkflows[oldStep.workflowId.toString()];
          if (!calIdWorkflowId) {
            ctx.log(`Skipping workflow step ${oldStep.id} - workflow not found`);
            return null;
          }

          const newStep = await ctx.newDb.calIdWorkflowStep.create({
            data: {
              stepNumber: oldStep.stepNumber,
              action: oldStep.action,
              workflowId: calIdWorkflowId,
              sendTo: oldStep.sendTo,
              reminderBody: oldStep.reminderBody,
              emailSubject: oldStep.emailSubject,
              template: oldStep.template,
              numberRequired: oldStep.numberRequired,
              sender: oldStep.sender,
              numberVerificationPending: oldStep.numberVerificationPending,
              includeCalendarEvent: oldStep.includeCalendarEvent,
              verifiedAt: oldStep.verifiedAt,
            },
          });

          ctx.idMappings.calIdWorkflowSteps[oldStep.id.toString()] = newStep.id;
          return newStep;
        } catch (error) {
          ctx.logError(`Failed to migrate workflow step ${oldStep.id}`, error);
          return null;
        }
      })
    );
    return newSteps.filter(Boolean);
  });

  ctx.log(`Migrated workflow steps to CalIdWorkflowSteps`);
}

export async function migrateCalIdWorkflowsOnEventTypes(ctx: MigrationContext) {
  ctx.log("Migrating WorkflowsOnEventTypes → CalIdWorkflowsOnEventTypes...");

  const oldRelations = await ctx.oldDb.workflowsOnEventTypes.findMany();

  await ctx.processBatch(oldRelations, async (batch) => {
    const newRelations = await Promise.all(
      batch.map(async (oldRelation: any) => {
        try {
          const calIdWorkflowId = ctx.idMappings.calIdWorkflows[oldRelation.workflowId.toString()];
          const eventTypeId = ctx.idMappings.eventTypes[oldRelation.eventTypeId.toString()];

          if (!calIdWorkflowId || !eventTypeId) {
            ctx.log(
              `Skipping workflow-eventtype relation ${oldRelation.id} - workflow or event type not found`
            );
            return null;
          }

          const newRelation = await ctx.newDb.calIdWorkflowsOnEventTypes.create({
            data: {
              workflowId: calIdWorkflowId,
              eventTypeId: eventTypeId,
            },
          });

          return newRelation;
        } catch (error) {
          ctx.logError(`Failed to migrate workflow-eventtype relation ${oldRelation.id}`, error);
          return null;
        }
      })
    );
    return newRelations.filter(Boolean);
  });

  ctx.log(`Migrated workflows on event types to CalIdWorkflowsOnEventTypes`);
}

export async function migrateCalIdWorkflowReminders(ctx: MigrationContext) {
  ctx.log("Migrating WorkflowReminder → CalIdWorkflowReminder...");

  const oldReminders = await ctx.oldDb.workflowReminder.findMany();

  await ctx.processBatch(oldReminders, async (batch) => {
    const newReminders = await Promise.all(
      batch.map(async (oldReminder: any) => {
        try {
          const calIdWorkflowStepId = oldReminder.workflowStepId
            ? ctx.idMappings.calIdWorkflowSteps[oldReminder.workflowStepId.toString()]
            : null;

          const newReminder = await ctx.newDb.calIdWorkflowReminder.create({
            data: {
              uuid: oldReminder.uuid,
              bookingUid: oldReminder.bookingUid,
              method: oldReminder.method,
              scheduledDate: oldReminder.scheduledDate,
              referenceId: oldReminder.referenceId,
              scheduled: oldReminder.scheduled,
              workflowStepId: calIdWorkflowStepId,
              cancelled: oldReminder.cancelled,
              seatReferenceId: oldReminder.seatReferenceId,
              isMandatoryReminder: oldReminder.isMandatoryReminder,
              retryCount: oldReminder.retryCount,
              userId: null,
            },
          });

          return newReminder;
        } catch (error) {
          ctx.logError(`Failed to migrate workflow reminder ${oldReminder.id}`, error);
          return null;
        }
      })
    );
    return newReminders.filter(Boolean);
  });

  ctx.log(`Migrated workflow reminders to CalIdWorkflowReminders`);
}

export async function runPhase9(ctx: MigrationContext) {
  ctx.log("=== PHASE 9: Workflows ===");
  await migrateCalIdWorkflows(ctx);
  await migrateCalIdWorkflowSteps(ctx);
  await migrateCalIdWorkflowsOnEventTypes(ctx);
  await migrateCalIdWorkflowReminders(ctx);
}

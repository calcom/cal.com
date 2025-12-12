import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  IWorkflowStepRepository,
  WorkflowStepCreateInputDto,
  WorkflowStepDto,
  WorkflowStepUpdateInputDto,
} from "./IWorkflowStepRepository";

export class KyselyWorkflowStepRepository implements IWorkflowStepRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async deleteById(id: number): Promise<WorkflowStepDto> {
    const result = await this.writeDb
      .deleteFrom("WorkflowStep")
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async createWorkflowStep(data: WorkflowStepCreateInputDto): Promise<WorkflowStepDto> {
    const result = await this.writeDb
      .insertInto("WorkflowStep")
      .values({
        stepNumber: data.stepNumber,
        action: data.action,
        workflowId: data.workflowId,
        sendTo: data.sendTo ?? null,
        reminderBody: data.reminderBody ?? null,
        emailSubject: data.emailSubject ?? null,
        template: data.template,
        numberRequired: data.numberRequired ?? null,
        sender: data.sender ?? null,
        numberVerificationPending: data.numberVerificationPending ?? false,
        includeCalendarEvent: data.includeCalendarEvent ?? false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async updateWorkflowStep(id: number, data: WorkflowStepUpdateInputDto): Promise<WorkflowStepDto> {
    const updateData: Record<string, unknown> = {};
    if (data.stepNumber !== undefined) updateData.stepNumber = data.stepNumber;
    if (data.action !== undefined) updateData.action = data.action;
    if (data.sendTo !== undefined) updateData.sendTo = data.sendTo;
    if (data.reminderBody !== undefined) updateData.reminderBody = data.reminderBody;
    if (data.emailSubject !== undefined) updateData.emailSubject = data.emailSubject;
    if (data.template !== undefined) updateData.template = data.template;
    if (data.numberRequired !== undefined) updateData.numberRequired = data.numberRequired;
    if (data.sender !== undefined) updateData.sender = data.sender;
    if (data.numberVerificationPending !== undefined)
      updateData.numberVerificationPending = data.numberVerificationPending;
    if (data.includeCalendarEvent !== undefined) updateData.includeCalendarEvent = data.includeCalendarEvent;

    const result = await this.writeDb
      .updateTable("WorkflowStep")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }
}

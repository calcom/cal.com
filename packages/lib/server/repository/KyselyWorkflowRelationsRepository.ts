import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  IWorkflowRelationsRepository,
  WorkflowOnEventTypeDto,
  WorkflowOnTeamDto,
} from "./IWorkflowRelationsRepository";

export class KyselyWorkflowRelationsRepository implements IWorkflowRelationsRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async deleteAllActiveOnTeams(workflowId: number): Promise<{ count: number }> {
    const result = await this.writeDb
      .deleteFrom("WorkflowsOnTeams")
      .where("workflowId", "=", workflowId)
      .executeTakeFirst();

    return { count: Number(result.numDeletedRows) };
  }

  async createActiveOnTeams(workflowId: number, teamIds: number[]): Promise<void> {
    if (teamIds.length === 0) return;

    await this.writeDb
      .insertInto("WorkflowsOnTeams")
      .values(teamIds.map((teamId) => ({ workflowId, teamId })))
      .execute();
  }

  async findActiveOnTeams(workflowId: number): Promise<WorkflowOnTeamDto[]> {
    const results = await this.readDb
      .selectFrom("WorkflowsOnTeams")
      .select(["teamId"])
      .where("workflowId", "=", workflowId)
      .execute();

    return results;
  }

  async deleteAllActiveOnRoutingForms(workflowId: number): Promise<{ count: number }> {
    const result = await this.writeDb
      .deleteFrom("WorkflowsOnRoutingForms")
      .where("workflowId", "=", workflowId)
      .executeTakeFirst();

    return { count: Number(result.numDeletedRows) };
  }

  async createActiveOnRoutingForms(workflowId: number, routingFormIds: string[]): Promise<void> {
    if (routingFormIds.length === 0) return;

    await this.writeDb
      .insertInto("WorkflowsOnRoutingForms")
      .values(routingFormIds.map((routingFormId) => ({ workflowId, routingFormId })))
      .execute();
  }

  async deleteAllActiveOnEventTypes(workflowId: number): Promise<{ count: number }> {
    const result = await this.writeDb
      .deleteFrom("WorkflowsOnEventTypes")
      .where("workflowId", "=", workflowId)
      .executeTakeFirst();

    return { count: Number(result.numDeletedRows) };
  }

  async createActiveOnEventTypes(workflowId: number, eventTypeIds: number[]): Promise<void> {
    if (eventTypeIds.length === 0) return;

    await this.writeDb
      .insertInto("WorkflowsOnEventTypes")
      .values(eventTypeIds.map((eventTypeId) => ({ workflowId, eventTypeId })))
      .execute();
  }

  async findActiveOnEventTypes(workflowId: number): Promise<WorkflowOnEventTypeDto[]> {
    // Get workflows on event types
    const workflowsOnEventTypes = await this.readDb
      .selectFrom("WorkflowsOnEventTypes")
      .select(["eventTypeId"])
      .where("workflowId", "=", workflowId)
      .execute();

    // For each event type, get its children
    const results: WorkflowOnEventTypeDto[] = [];
    for (const woe of workflowsOnEventTypes) {
      const children = await this.readDb
        .selectFrom("EventType")
        .select(["id"])
        .where("parentId", "=", woe.eventTypeId)
        .execute();

      results.push({
        eventTypeId: woe.eventTypeId,
        eventType: {
          children: children.map((c) => ({ id: c.id })),
        },
      });
    }

    return results;
  }

  async deleteAllActiveOnRelations(workflowId: number): Promise<void> {
    await Promise.all([
      this.deleteAllActiveOnTeams(workflowId),
      this.deleteAllActiveOnRoutingForms(workflowId),
      this.deleteAllActiveOnEventTypes(workflowId),
    ]);
  }
}

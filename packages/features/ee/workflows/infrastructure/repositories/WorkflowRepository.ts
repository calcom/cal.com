import db from "@calcom/prisma";

import type { IWorkflowRepository } from "../../domain/repositories/IWorkflowRepository";
import type { Workflow } from "../../domain/models/Workflow";
import { WorkflowOutputMapper } from "../mappers/WorkflowOutputMapper";

// Use typeof to match the actual prisma instance type with extensions
type WorkflowPrisma = typeof db;

/**
 * Infrastructure implementation of IWorkflowRepository
 * Handles Prisma interactions and maps to domain models
 * Following PBAC's RoleRepository pattern
 * 
 * NOTE: This implementation is intentionally minimal, containing only the methods
 * currently used by the migrated code. Additional methods will be added as
 * more code is migrated to use the DDD structure.
 */
export class WorkflowRepository implements IWorkflowRepository {
  constructor(private readonly prisma: WorkflowPrisma = db) {}

  private readonly includeSteps = {
    steps: {
      orderBy: {
        stepNumber: "asc" as const,
      },
    },
  };

  async findWorkflowsActiveOnRoutingForm(routingFormId: string): Promise<Workflow[]> {
    const results = await this.prisma.workflow.findMany({
      where: {
        activeOnRoutingForms: {
          some: {
            routingFormId,
          },
        },
      },
      include: this.includeSteps,
    });
    // Type assertion needed due to Prisma extension type narrowing
    // The query returns the correct shape at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return WorkflowOutputMapper.toDomainList(results as any);
  }
}

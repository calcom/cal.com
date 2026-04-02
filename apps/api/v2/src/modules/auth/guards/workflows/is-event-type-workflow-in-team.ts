import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import { WorkflowsRepository, WorkflowType } from "@/modules/workflows/workflows.repository";

@Injectable()
export class IsEventTypeWorkflowInTeam implements CanActivate {
  constructor(private workflowsRepository: WorkflowsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { workflow?: WorkflowType }>();
    const teamId: string = request.params.teamId;
    const workflowId: string = request.params.workflowId;

    if (!workflowId) {
      throw new ForbiddenException("IsWorkflowInTeam - No workflow found in request params.");
    }

    if (!teamId) {
      throw new ForbiddenException("IsWorkflowInTeam - No team id found in request params.");
    }

    const { canAccess, workflow } = await this.checkIfWorkflowIsInTeam(teamId, workflowId);

    if (!canAccess) {
      throw new ForbiddenException(
        `IsTeamInOrg - Workflow with id=${workflowId} is not part of the team with id=${teamId}.`
      );
    }

    request.workflow = workflow;
    return true;
  }

  async checkIfWorkflowIsInTeam(
    teamId: string,
    workflowId: string
  ): Promise<{ canAccess: boolean; workflow?: WorkflowType }> {
    const workflow = await this.workflowsRepository.getEventTypeTeamWorkflowById(
      Number(teamId),
      Number(workflowId)
    );

    if (!workflow) {
      throw new NotFoundException(`IsWorkflowInTeam - event-type workflow (${workflowId}) not found.`);
    }

    if (workflow.teamId === Number(teamId)) {
      return { canAccess: true, workflow };
    }

    return { canAccess: false };
  }
}

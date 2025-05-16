import { WorkflowsRepository, WorkflowType } from "@/modules/workflows/workflows.repository";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class IsWorkflowInTeam implements CanActivate {
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
    const workflow = await this.workflowsRepository.getTeamWorkflowById(Number(teamId), Number(workflowId));

    if (!workflow) {
      throw new NotFoundException(`IsWorkflowInTeam - workflow (${workflowId}) not found.`);
    }

    if (workflow.teamId === Number(teamId)) {
      return { canAccess: true, workflow };
    }

    return { canAccess: false };
  }
}

import { UserWithProfile } from "@/modules/users/users.repository";
import { CreateWorkflowDto, UpdateWorkflowDto } from "@/modules/workflows/inputs/create-workflow.input";
import { WorkflowsRepository } from "@/modules/workflows/workflows.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TeamWorkflowsService {
  constructor(private readonly workflowsRepository: WorkflowsRepository) {}

  async getTeamWorkflows(teamId: number, skip: number, take: number) {
    const workflows = await this.workflowsRepository.getTeamWorkflows(teamId, skip, take);

    return workflows.map((workflow) => this.workflowsRepository.toDto(workflow));
  }

  async getTeamWorkflowById(teamId: number, workflowId: number) {
    const workflow = await this.workflowsRepository.getTeamWorkflowById(teamId, workflowId);

    return this.workflowsRepository.toDto(workflow);
  }

  async createTeamWorkflow(user: UserWithProfile, teamId: number, data: CreateWorkflowDto) {
    return this.workflowsRepository.toDto(
      await this.workflowsRepository.createTeamWorkflow(user, teamId, data)
    );
  }

  async updateTeamWorkflow(
    user: UserWithProfile,
    teamId: number,
    workflowId: number,
    data: UpdateWorkflowDto
  ) {
    return this.workflowsRepository.toDto(
      await this.workflowsRepository.updateTeamWorkflow(user, teamId, workflowId, data)
    );
  }

  async deleteTeamWorkflow(teamId: number, workflowId: number) {
    return await this.workflowsRepository.deleteTeamWorkflowById(teamId, workflowId);
  }
}

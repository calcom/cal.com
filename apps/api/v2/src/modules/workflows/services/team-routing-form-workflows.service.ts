import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { UserWithProfile } from "@/modules/users/users.repository";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import { CreateFormWorkflowDto } from "@/modules/workflows/inputs/create-form-workflow";
import { UpdateFormWorkflowDto } from "@/modules/workflows/inputs/update-form-workflow.input";
import { WorkflowsInputService } from "@/modules/workflows/services/workflows.input.service";
import { WorkflowsOutputService } from "@/modules/workflows/services/workflows.output.service";
import { WorkflowsRepository } from "@/modules/workflows/workflows.repository";

@Injectable()
export class TeamRoutingFormWorkflowsService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly teamsVerifiedResourcesRepository: TeamsVerifiedResourcesRepository,
    private readonly workflowInputService: WorkflowsInputService,
    private readonly workflowOutputService: WorkflowsOutputService
  ) {}

  async getRoutingFormTeamWorkflows(teamId: number, skip: number, take: number) {
    const workflows = await this.workflowsRepository.getRoutingFormTeamWorkflows(teamId, skip, take);

    return workflows.map((workflow) => {
      const output = this.workflowOutputService.toRoutingFormOutputDto(workflow);

      if (!output) {
        throw new BadRequestException(`Could not format workflow for response.`);
      }
      return output;
    });
  }

  async getRoutingFormTeamWorkflowById(teamId: number, workflowId: number) {
    const workflow = await this.workflowsRepository.getRoutingFormTeamWorkflowById(teamId, workflowId);

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found for team ${teamId}`);
    }

    const output = this.workflowOutputService.toRoutingFormOutputDto(workflow);

    if (!output) {
      throw new BadRequestException(`Could not format workflow for response.`);
    }
    return output;
  }

  async createFormTeamWorkflow(user: UserWithProfile, teamId: number, data: CreateFormWorkflowDto) {
    const workflowHusk = await this.workflowsRepository.createTeamWorkflowHusk(teamId);
    const mappedData = await this.workflowInputService.mapFormUpdateDtoToZodSchema(
      data,
      workflowHusk.id,
      teamId,
      workflowHusk
    );

    const createdWorkflow = await this.workflowsRepository.updateRoutingFormTeamWorkflow(
      user,
      teamId,
      workflowHusk.id,
      mappedData
    );
    if (!createdWorkflow) {
      throw new BadRequestException(`Could not create Workflow in team ${teamId}`);
    }

    const output = this.workflowOutputService.toRoutingFormOutputDto(createdWorkflow);

    if (!output) {
      throw new BadRequestException(`Could not format workflow for response.`);
    }
    return output;
  }

  async updateFormTeamWorkflow(
    user: UserWithProfile,
    teamId: number,
    workflowId: number,
    data: UpdateFormWorkflowDto
  ) {
    const currentWorkflow = await this.workflowsRepository.getRoutingFormTeamWorkflowById(teamId, workflowId);

    if (!currentWorkflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found for team ${teamId}`);
    }
    const mappedData = await this.workflowInputService.mapFormUpdateDtoToZodSchema(
      data,
      workflowId,
      teamId,
      currentWorkflow
    );

    const updatedWorkflow = await this.workflowsRepository.updateRoutingFormTeamWorkflow(
      user,
      teamId,
      workflowId,
      mappedData
    );

    if (!updatedWorkflow) {
      throw new BadRequestException(`Could not update Workflow with ID ${workflowId} in team ${teamId}`);
    }

    const output = this.workflowOutputService.toRoutingFormOutputDto(updatedWorkflow);

    if (!output) {
      throw new BadRequestException(`Could not format workflow for response.`);
    }
    return output;
  }

  async deleteTeamRoutingFormWorkflow(teamId: number, workflowId: number) {
    return await this.workflowsRepository.deleteTeamWorkflowById(teamId, workflowId);
  }
}

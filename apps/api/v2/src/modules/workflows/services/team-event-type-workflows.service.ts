import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { UserWithProfile } from "@/modules/users/users.repository";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import { CreateEventTypeWorkflowDto } from "@/modules/workflows/inputs/create-event-type-workflow.input";
import { UpdateEventTypeWorkflowDto } from "@/modules/workflows/inputs/update-event-type-workflow.input";
import { WorkflowsInputService } from "@/modules/workflows/services/workflows.input.service";
import { WorkflowsOutputService } from "@/modules/workflows/services/workflows.output.service";
import { WorkflowsRepository } from "@/modules/workflows/workflows.repository";

@Injectable()
export class TeamEventTypeWorkflowsService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly teamsVerifiedResourcesRepository: TeamsVerifiedResourcesRepository,
    private readonly workflowInputService: WorkflowsInputService,
    private readonly workflowOutputService: WorkflowsOutputService
  ) {}

  async getEventTypeTeamWorkflows(teamId: number, skip: number, take: number) {
    const workflows = await this.workflowsRepository.getEventTypeTeamWorkflows(teamId, skip, take);

    return workflows.map((workflow) => {
      const output = this.workflowOutputService.toEventTypeOutputDto(workflow);

      if (!output) {
        throw new BadRequestException(`Could not format workflow for response.`);
      }
      return output;
    });
  }

  async getEventTypeTeamWorkflowById(teamId: number, workflowId: number) {
    const workflow = await this.workflowsRepository.getEventTypeTeamWorkflowById(teamId, workflowId);

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found for team ${teamId}`);
    }

    const output = this.workflowOutputService.toEventTypeOutputDto(workflow);

    if (!output) {
      throw new BadRequestException(`Could not format workflow for response.`);
    }
    return output;
  }

  async createEventTypeTeamWorkflow(user: UserWithProfile, teamId: number, data: CreateEventTypeWorkflowDto) {
    const workflowHusk = await this.workflowsRepository.createTeamWorkflowHusk(teamId);
    const mappedData = await this.workflowInputService.mapEventTypeUpdateDtoToZodSchema(
      data,
      workflowHusk.id,
      teamId,
      workflowHusk
    );

    const createdWorkflow = await this.workflowsRepository.updateEventTypeTeamWorkflow(
      user,
      teamId,
      workflowHusk.id,
      mappedData
    );
    if (!createdWorkflow) {
      throw new BadRequestException(`Could not create Workflow in team ${teamId}`);
    }

    const output = this.workflowOutputService.toEventTypeOutputDto(createdWorkflow);

    if (!output) {
      throw new BadRequestException(`Could not format workflow for response.`);
    }
    return output;
  }

  async updateEventTypeTeamWorkflow(
    user: UserWithProfile,
    teamId: number,
    workflowId: number,
    data: UpdateEventTypeWorkflowDto
  ) {
    const currentWorkflow = await this.workflowsRepository.getEventTypeTeamWorkflowById(teamId, workflowId);

    if (!currentWorkflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found for team ${teamId}`);
    }
    const mappedData = await this.workflowInputService.mapEventTypeUpdateDtoToZodSchema(
      data,
      workflowId,
      teamId,
      currentWorkflow
    );

    const updatedWorkflow = await this.workflowsRepository.updateEventTypeTeamWorkflow(
      user,
      teamId,
      workflowId,
      mappedData
    );

    if (!updatedWorkflow) {
      throw new BadRequestException(`Could not update Workflow with ID ${workflowId} in team ${teamId}`);
    }
    const output = this.workflowOutputService.toEventTypeOutputDto(updatedWorkflow);

    if (!output) {
      throw new BadRequestException(`Could not format workflow for response.`);
    }
    return output;
  }

  async deleteTeamEventTypeWorkflow(teamId: number, workflowId: number) {
    return await this.workflowsRepository.deleteTeamWorkflowById(teamId, workflowId);
  }
}

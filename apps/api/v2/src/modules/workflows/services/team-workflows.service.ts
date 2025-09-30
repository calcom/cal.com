import { UserWithProfile } from "@/modules/users/users.repository";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import { CreateFormWorkflowDto } from "@/modules/workflows/inputs/create-form-workflow";
import { CreateWorkflowDto } from "@/modules/workflows/inputs/create-workflow.input";
import { UpdateFormWorkflowDto } from "@/modules/workflows/inputs/update-form-workflow.input";
import { UpdateWorkflowDto } from "@/modules/workflows/inputs/update-workflow.input";
import { WorkflowsInputService } from "@/modules/workflows/services/workflows.input.service";
import { WorkflowsOutputService } from "@/modules/workflows/services/workflows.output.service";
import { WorkflowsRepository } from "@/modules/workflows/workflows.repository";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class TeamWorkflowsService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly teamsVerifiedResourcesRepository: TeamsVerifiedResourcesRepository,
    private readonly workflowInputService: WorkflowsInputService,
    private readonly workflowOutputService: WorkflowsOutputService
  ) {}

  async getTeamWorkflows(teamId: number, skip: number, take: number) {
    const workflows = await this.workflowsRepository.getTeamWorkflows(teamId, skip, take);

    return workflows.map((workflow) => this.workflowOutputService.toOutputDto(workflow));
  }

  async getTeamWorkflowById(teamId: number, workflowId: number) {
    const workflow = await this.workflowsRepository.getTeamWorkflowById(teamId, workflowId);

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found for team ${teamId}`);
    }

    return this.workflowOutputService.toOutputDto(workflow);
  }

  async createEventTypeTeamWorkflow(user: UserWithProfile, teamId: number, data: CreateWorkflowDto) {
    const workflowHusk = await this.workflowsRepository.createTeamWorkflowHusk(teamId);
    const mappedData = await this.workflowInputService.mapEventTypeUpdateDtoToZodSchema(
      data,
      workflowHusk.id,
      teamId,
      workflowHusk
    );

    const createdWorkflow = await this.workflowsRepository.updateTeamWorkflow(
      user,
      teamId,
      workflowHusk.id,
      mappedData
    );
    if (!createdWorkflow) {
      throw new BadRequestException(`Could not create Workflow in team ${teamId}`);
    }

    return this.workflowOutputService.toOutputDto(createdWorkflow);
  }

  async createFormTeamWorkflow(user: UserWithProfile, teamId: number, data: CreateFormWorkflowDto) {
    const workflowHusk = await this.workflowsRepository.createTeamWorkflowHusk(teamId);
    const mappedData = await this.workflowInputService.mapFormUpdateDtoToZodSchema(
      data,
      workflowHusk.id,
      teamId,
      workflowHusk
    );

    const createdWorkflow = await this.workflowsRepository.updateTeamWorkflow(
      user,
      teamId,
      workflowHusk.id,
      mappedData
    );
    if (!createdWorkflow) {
      throw new BadRequestException(`Could not create Workflow in team ${teamId}`);
    }

    return this.workflowOutputService.toOutputDto(createdWorkflow);
  }

  async updateFormTeamWorkflow(
    user: UserWithProfile,
    teamId: number,
    workflowId: number,
    data: UpdateFormWorkflowDto
  ) {
    const currentWorkflow = await this.workflowsRepository.getTeamWorkflowById(teamId, workflowId);

    if (!currentWorkflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found for team ${teamId}`);
    }
    const mappedData = await this.workflowInputService.mapFormUpdateDtoToZodSchema(
      data,
      workflowId,
      teamId,
      currentWorkflow
    );

    const updatedWorkflow = await this.workflowsRepository.updateTeamWorkflow(
      user,
      teamId,
      workflowId,
      mappedData
    );

    if (!updatedWorkflow) {
      throw new BadRequestException(`Could not update Workflow with ID ${workflowId} in team ${teamId}`);
    }

    return this.workflowOutputService.toOutputDto(updatedWorkflow);
  }

  async updateEventTypeTeamWorkflow(
    user: UserWithProfile,
    teamId: number,
    workflowId: number,
    data: UpdateWorkflowDto
  ) {
    const currentWorkflow = await this.workflowsRepository.getTeamWorkflowById(teamId, workflowId);

    if (!currentWorkflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found for team ${teamId}`);
    }
    const mappedData = await this.workflowInputService.mapEventTypeUpdateDtoToZodSchema(
      data,
      workflowId,
      teamId,
      currentWorkflow
    );

    const updatedWorkflow = await this.workflowsRepository.updateTeamWorkflow(
      user,
      teamId,
      workflowId,
      mappedData
    );

    if (!updatedWorkflow) {
      throw new BadRequestException(`Could not update Workflow with ID ${workflowId} in team ${teamId}`);
    }

    return this.workflowOutputService.toOutputDto(updatedWorkflow);
  }

  async deleteTeamWorkflow(teamId: number, workflowId: number) {
    return await this.workflowsRepository.deleteTeamWorkflowById(teamId, workflowId);
  }
}

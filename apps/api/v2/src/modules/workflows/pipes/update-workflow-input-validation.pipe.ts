import { UpdateFormWorkflowDto } from "@/modules/workflows/inputs/update-form-workflow.input";
import { UpdateWorkflowDto } from "@/modules/workflows/inputs/update-workflow.input";
import { WorkflowsOutputService } from "@/modules/workflows/services/workflows.output.service";
import { WorkflowsRepository } from "@/modules/workflows/workflows.repository";
import {
  Injectable,
  ArgumentMetadata,
  ValidationPipe,
  Inject,
  Scope,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { plainToInstance } from "class-transformer";
import { Request } from "express";

@Injectable({ scope: Scope.REQUEST })
export class UpdateWorkflowValidationPipe extends ValidationPipe {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly workflowsOutputService: WorkflowsOutputService
  ) {
    super();
  }

  async transform(value: UpdateFormWorkflowDto | UpdateWorkflowDto, metadata: ArgumentMetadata) {
    // transform the body of the request before validation against DTO
    if (metadata.type === "body") {
      const workflowId = parseInt(this.request.params.workflowId, 10);

      if (!workflowId) {
        throw new BadRequestException("Missing workflow id.");
      }

      const teamId = parseInt(this.request.params.teamId, 10);
      if (!teamId) {
        throw new BadRequestException("Missing team id.");
      }

      const workflow = await this.workflowsRepository.getTeamWorkflowById(teamId, workflowId);

      if (!workflow) {
        throw new NotFoundException("Workflow does not exist.");
      }

      const workflowData = this.workflowsOutputService.toOutputDto(workflow);
      const discriminator = value?.type ?? "event-type";

      // For partial updates, merge incoming data with the existing workflow to ensure complete validation.
      if (value && discriminator === "form") {
        return super.transform(plainToInstance(UpdateFormWorkflowDto, { ...workflowData, ...value }), {
          ...metadata,
          metatype: UpdateFormWorkflowDto,
        });
      } else {
        return super.transform(plainToInstance(UpdateWorkflowDto, { ...workflowData, ...value }), {
          ...metadata,
          metatype: UpdateWorkflowDto,
        });
      }
    }

    return super.transform(value, metadata);
  }
}

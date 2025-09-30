import { CreateFormWorkflowDto } from "@/modules/workflows/inputs/create-form-workflow";
import { CreateWorkflowDto } from "@/modules/workflows/inputs/create-workflow.input";
import { Injectable, ArgumentMetadata, ValidationPipe } from "@nestjs/common";
import { plainToInstance } from "class-transformer";

@Injectable()
export class WorkflowValidationPipe extends ValidationPipe {
  async transform(value: CreateFormWorkflowDto | CreateWorkflowDto, metadata: ArgumentMetadata) {
    // transform the body of the request before validation against DTO
    if (metadata.type === "body") {
      // Default to event-type if not provided
      const discriminator = value?.type ?? "event-type";
      console.log("PIPE", value);

      // Dynamically select DTO class
      if (discriminator === "form") {
        return super.transform(plainToInstance(CreateFormWorkflowDto, value), {
          ...metadata,
          metatype: CreateFormWorkflowDto,
        });
      } else {
        return await super.transform(plainToInstance(CreateWorkflowDto, value), {
          ...metadata,
          metatype: CreateWorkflowDto,
        });
      }
    }

    return super.transform(value, metadata);
  }
}

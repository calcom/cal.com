import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";

export class CreateRoutingFormResponseFromQueuedInput {
  @ApiProperty({
    type: Object,
    description: "Form field responses that will be processed from the queued response",
    example: { email: "abc@example.com", anyotherfield: "value" },
  })
  @IsObject()
  @IsOptional()
  response?: Record<string, string | string[]>;
}

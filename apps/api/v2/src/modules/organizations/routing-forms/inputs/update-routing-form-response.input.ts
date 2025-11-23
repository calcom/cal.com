import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class UpdateRoutingFormResponseInput {
  @ApiPropertyOptional({ type: Object, description: "The updated response data" })
  @IsOptional()
  response?: Record<string, any>;
}

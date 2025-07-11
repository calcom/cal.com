import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

import { GetAvailableSlotsInput_2024_09_04 } from "@calcom/platform-types";

export class CreateRoutingFormResponseInput extends GetAvailableSlotsInput_2024_09_04 {
  @Transform(({ value }: { value: string | boolean }) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    type: Boolean,
    description: "Whether to queue the form response.",
    example: true,
  })
  queueResponse?: boolean;
}

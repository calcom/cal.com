import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class RefreshApiKeyInput {
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "For how many days is managed organization api key valid. Defaults to 30 days.",
    example: 60,
    default: 30,
    minimum: 1,
  })
  readonly apiKeyDaysValid?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: "If true, organization api key never expires.", example: true })
  readonly apiKeyNeverExpires?: boolean;
}

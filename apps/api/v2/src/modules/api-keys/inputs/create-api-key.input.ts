import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";
import { RefreshApiKeyInput } from "@/modules/api-keys/inputs/refresh-api-key.input";

export class CreateApiKeyInput extends RefreshApiKeyInput {
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({
    description: "For which team or organization is the api key.",
  })
  readonly teamId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: "Store additional note about this api key.",
    example: "This is an api key for development purposes.",
  })
  readonly note?: string;
}

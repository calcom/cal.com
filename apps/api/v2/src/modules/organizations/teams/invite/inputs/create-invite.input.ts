import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateInviteInput {
  @ApiPropertyOptional({
    description:
      "Existing invite token for this team. If provided, the endpoint returns the same token and invite link instead of creating a new one.",
    example: "f6a5c8b1d2e34c7f90a1b2c3d4e5f6a5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
  })
  @IsOptional()
  @IsString()
  token?: string;
}



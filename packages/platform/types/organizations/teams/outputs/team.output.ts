import { ApiPropertyOptional, ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";
import { TeamOutputDto } from "../../../teams/outputs";

export class OrgTeamOutputDto extends TeamOutputDto {
  @IsInt()
  @IsOptional()
  @Expose()
  @ApiPropertyOptional()
  readonly parentId?: number;
}

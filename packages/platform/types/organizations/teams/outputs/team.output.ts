import { Expose } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

import { TeamOutputDto } from "../../../teams/outputs";

export class OrgTeamOutputDto extends TeamOutputDto {
  @IsInt()
  @IsOptional()
  @Expose()
  readonly parentId?: number;
}

import { UpdateTeamDto } from "@/modules/teams/teams/inputs/update-team.input";
import { IsBoolean, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class UpdateOrgTeamDto extends UpdateTeamDto {}

import { Expose, Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

export class TeamMemberDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsOptional()
  @IsString()
  @Expose()
  readonly name!: string | null;

  @IsString()
  @Expose()
  readonly email!: string;
}

export class FindTeamMembersMatchingAttributeOutputDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  @Expose()
  readonly result!: TeamMemberDto[] | null;
}

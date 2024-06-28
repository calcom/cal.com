import { IsBoolean, IsOptional, IsString, Length, IsNumber } from "class-validator";

// import { MembershipRole } from "@calcom/prisma/enums";

export class CreateOrgMembershipDto {
  @IsString()
  @Length(1)
  readonly name!: string;

  @IsNumber()
  readonly teamId!: number;

  @IsNumber()
  readonly userId!: number;

  @IsOptional()
  @IsBoolean()
  readonly accepted?: boolean = false;

  @IsOptional()
  @IsString()
  readonly role?: string = "MEMBER";

  @IsOptional()
  @IsBoolean()
  readonly disableImpersonation?: boolean = false;
}

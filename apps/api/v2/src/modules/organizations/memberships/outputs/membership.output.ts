import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";
import { Expose } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class OrgMembershipOutputDto {
  @IsInt()
  @Expose()
  @ApiProperty()
  readonly id!: number;

  @IsInt()
  @Expose()
  @ApiProperty()
  readonly userId!: number;

  @IsInt()
  @Expose()
  @ApiProperty()
  readonly teamId!: number;

  @IsBoolean()
  @Expose()
  @ApiProperty()
  readonly accepted!: boolean;

  @IsString()
  @ApiProperty({ enum: ["MEMBER", "OWNER", "ADMIN"] })
  @Expose()
  readonly role!: MembershipRole;

  @IsOptional()
  @IsBoolean()
  @Expose()
  @ApiPropertyOptional()
  readonly disableImpersonation?: boolean;
}

import { MembershipRole } from "@calcom/platform-libraries";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

class MembershipUserOutputDto {
  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly avatarUrl?: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly username?: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly name?: string;

  @IsBoolean()
  @Expose()
  @ApiProperty()
  readonly email!: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly bio?: string;

  @ApiPropertyOptional({
    type: Object,
    example: { key: "value" },
  })
  @IsObject()
  @IsOptional()
  @Expose()
  @Transform(
    // note(Lauris): added this transform because without it metadata is removed for some reason
    ({ obj }: { obj: { metadata: Record<string, unknown> | null | undefined } }) => {
      return obj.metadata || undefined;
    }
  )
  metadata?: Record<string, unknown>;
}

export class TeamMembershipOutput {
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

  @ValidateNested()
  @Type(() => MembershipUserOutputDto)
  @Expose()
  @ApiProperty({ type: MembershipUserOutputDto })
  user!: MembershipUserOutputDto;
}

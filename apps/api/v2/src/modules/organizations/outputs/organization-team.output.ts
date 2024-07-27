import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  ValidateNested,
} from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class OrgTeamOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsInt()
  @IsOptional()
  @Expose()
  readonly parentId?: number;

  @IsString()
  @Length(1)
  @Expose()
  readonly name!: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly slug?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly logoUrl?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly calVideoLogo?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly appLogo?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly appIconLogo?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly bio?: string;

  @IsOptional()
  @IsBoolean()
  @Expose()
  readonly hideBranding?: boolean;

  @IsBoolean()
  @Expose()
  readonly isOrganization?: boolean;

  @IsOptional()
  @IsBoolean()
  @Expose()
  readonly isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  @Expose()
  readonly hideBookATeamMember?: boolean = false;

  @IsOptional()
  @IsString()
  @Expose()
  readonly metadata?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly theme?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly brandColor?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly darkBrandColor?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly bannerUrl?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly timeFormat?: number;

  @IsOptional()
  @IsString()
  @Expose()
  readonly timeZone?: string = "Europe/London";

  @IsOptional()
  @IsString()
  @Expose()
  readonly weekStart?: string = "Sunday";
}

export class OrgMeTeamOutputDto extends OrgTeamOutputDto {
  @IsString()
  @Expose()
  readonly accepted!: boolean;
}

export class OrgTeamsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamOutputDto)
  data!: OrgTeamOutputDto[];
}

export class OrgMeTeamsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamOutputDto)
  data!: OrgTeamOutputDto[];
}

export class OrgTeamOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamOutputDto)
  data!: OrgTeamOutputDto;
}

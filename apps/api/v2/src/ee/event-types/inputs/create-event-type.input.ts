import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsEnum,
  Min,
  IsArray,
  IsUrl,
} from "class-validator";

import { SchedulingType } from "@calcom/prisma/enums";

class EventTypeLocation {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUrl()
  link?: string;

  @IsOptional()
  @IsBoolean()
  displayLocationPublicly?: boolean;

  @IsOptional()
  @IsString()
  hostPhoneNumber?: string;

  @IsOptional()
  @IsNumber()
  credentialId?: number;

  @IsOptional()
  @IsString()
  teamName?: string;
}
export class CreateEventTypeInput {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  length!: number;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsOptional()
  @IsEnum(SchedulingType)
  schedulingType?: SchedulingType;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EventTypeLocation)
  @IsArray()
  locations?: EventTypeLocation[];
}

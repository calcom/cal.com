import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  ValidateNested,
  Min,
  IsArray,
  IsUrl,
} from "class-validator";

// note(Lauris): We will gradually expose more properties if any customer needs them.
// Just uncomment any below when requested.

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
  @IsNumber()
  @Min(1)
  length!: number;

  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EventTypeLocation)
  @IsArray()
  locations?: EventTypeLocation[];

  // @ApiHideProperty()
  // @IsOptional()
  // @IsNumber()
  // teamId?: number;

  // @ApiHideProperty()
  // @IsOptional()
  // @IsEnum(SchedulingType)
  // schedulingType?: SchedulingType; -> import { SchedulingType } from "@/ee/event-types/inputs/enums/scheduling-type";
}

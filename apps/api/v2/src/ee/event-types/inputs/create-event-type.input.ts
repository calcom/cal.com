import { EventTypeLocation } from "@/ee/event-types/inputs/event-type-location.input";
import { ApiProperty as DocsProperty, ApiHideProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNumber, IsBoolean, IsOptional, ValidateNested, Min, IsArray } from "class-validator";

export const CREATE_EVENT_LENGTH_EXAMPLE = 60;
export const CREATE_EVENT_SLUG_EXAMPLE = "cooking-class";
export const CREATE_EVENT_TITLE_EXAMPLE = "Learn the secrets of masterchief!";
export const CREATE_EVENT_DESCRIPTION_EXAMPLE =
  "Discover the culinary wonders of the Argentina by making the best flan ever!";

// note(Lauris): We will gradually expose more properties if any customer needs them.
// Just uncomment any below when requested.
export class CreateEventTypeInput {
  @IsNumber()
  @Min(1)
  @DocsProperty({ example: CREATE_EVENT_LENGTH_EXAMPLE })
  length!: number;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_SLUG_EXAMPLE })
  slug!: string;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_TITLE_EXAMPLE })
  title!: string;

  @IsOptional()
  @IsString()
  @DocsProperty({ example: CREATE_EVENT_DESCRIPTION_EXAMPLE })
  description?: string;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  hidden?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EventTypeLocation)
  @IsArray()
  locations?: EventTypeLocation[];

  @IsBoolean()
  @IsOptional()
  disableGuests?: boolean;

  // @ApiHideProperty()
  // @IsOptional()
  // @IsNumber()
  // teamId?: number;

  // @ApiHideProperty()
  // @IsOptional()
  // @IsEnum(SchedulingType)
  // schedulingType?: SchedulingType; -> import { SchedulingType } from "@/ee/event-types/inputs/enums/scheduling-type";
}

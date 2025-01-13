import { EventTypeLocation_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/event-type-location.input";
import { ApiProperty as DocsProperty, ApiPropertyOptional, ApiHideProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  ValidateNested,
  Min,
  IsArray,
  IsInt,
} from "class-validator";

export const CREATE_EVENT_LENGTH_EXAMPLE = 60;
export const CREATE_EVENT_SLUG_EXAMPLE = "cooking-class";
export const CREATE_EVENT_TITLE_EXAMPLE = "Learn the secrets of masterchief!";
export const CREATE_EVENT_DESCRIPTION_EXAMPLE =
  "Discover the culinary wonders of the Argentina by making the best flan ever!";

// note(Lauris): We will gradually expose more properties if any customer needs them.
// Just uncomment any below when requested.
export class CreateEventTypeInput_2024_04_15 {
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
  @ApiPropertyOptional({
    type: String,
    example: CREATE_EVENT_DESCRIPTION_EXAMPLE,
  })
  description?: string;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  hidden?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EventTypeLocation_2024_04_15)
  @IsArray()
  @ApiPropertyOptional({
    type: [EventTypeLocation_2024_04_15],
  })
  locations?: EventTypeLocation_2024_04_15[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  disableGuests?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  slotInterval?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  minimumBookingNotice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  beforeEventBuffer?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  afterEventBuffer?: number;

  // @ApiHideProperty()
  // @IsOptional()
  // @IsNumber()
  // teamId?: number;

  // @ApiHideProperty()
  // @IsOptional()
  // @IsEnum(SchedulingType)
  // schedulingType?: SchedulingType; -> import { SchedulingType } from "@/ee/event-types/inputs/enums/scheduling-type";
}

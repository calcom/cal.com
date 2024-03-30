import { ApiProperty as DocsProperty, ApiHideProperty } from "@nestjs/swagger";
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
  @DocsProperty({ example: "link" })
  type!: string;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  address?: string;

  @IsOptional()
  @IsUrl()
  @DocsProperty({ example: "https://masterchief.com/argentina/flan/video/9129412" })
  link?: string;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  displayLocationPublicly?: boolean;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  hostPhoneNumber?: string;

  @IsOptional()
  @IsNumber()
  @ApiHideProperty()
  credentialId?: number;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  teamName?: string;
}
export class CreateEventTypeInput {
  @IsNumber()
  @Min(1)
  @DocsProperty({ example: 60 })
  length!: number;

  @IsString()
  @DocsProperty({ example: "cooking-class" })
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Learn the secrets of masterchief!" })
  title!: string;

  @IsOptional()
  @IsString()
  @DocsProperty({ example: "Discover the culinary wonders of the Argentina by making the best flan ever!" })
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

  // @ApiHideProperty()
  // @IsOptional()
  // @IsNumber()
  // teamId?: number;

  // @ApiHideProperty()
  // @IsOptional()
  // @IsEnum(SchedulingType)
  // schedulingType?: SchedulingType; -> import { SchedulingType } from "@/ee/event-types/inputs/enums/scheduling-type";
}

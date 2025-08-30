import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsInt, IsNumber, IsOptional } from "class-validator";

export class EventTypesAppInput {
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  teamId?: number;
}

export class BulkUpdateEventTypeToDefaultLocationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @ApiProperty({ type: [Number] })
  eventTypeIds!: number[];
}

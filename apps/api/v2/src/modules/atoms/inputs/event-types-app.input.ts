import { Transform, Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsInt, IsNumber, IsOptional } from "class-validator";

export class EventTypesAppInput {
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  teamId?: number;
}

export class BulkUpdateEventTypeToDefaultLocationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  eventTypeIds!: number[];
}

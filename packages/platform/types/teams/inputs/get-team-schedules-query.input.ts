import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

import { SkipTakePagination } from "../../pagination/pagination.input";

export class GetTeamSchedulesQuery extends SkipTakePagination {
  @ApiPropertyOptional({
    description:
      "Filter schedules by event type ID to return only schedules used by hosts of this event type for availability calculation",
    example: 123,
    type: Number,
  })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  eventTypeId?: number;
}

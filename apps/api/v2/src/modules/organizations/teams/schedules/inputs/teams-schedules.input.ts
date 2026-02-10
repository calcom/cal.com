import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

import { SkipTakePagination } from "@calcom/platform-types";

export class GetTeamSchedulesQuery extends SkipTakePagination {
  @ApiPropertyOptional({
    description: "Filter schedules by event type ID",
    example: 1,
  })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  eventTypeId?: number;
}

export class GetUserSchedulesQuery {
  @ApiPropertyOptional({
    description: "Filter schedules by event type ID",
    example: 1,
  })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  eventTypeId?: number;
}

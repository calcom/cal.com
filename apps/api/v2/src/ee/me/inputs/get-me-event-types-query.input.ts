import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

import { SortOrder, SortOrderType } from "@calcom/platform-types";

export class GetMeEventTypesQuery {
  @ApiPropertyOptional({
    enum: SortOrder,
    description: "Sort event types by creation date. When not provided, no explicit ordering is applied.",
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortCreatedAt?: SortOrderType;
}

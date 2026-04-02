import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export type SortOrderType = `${SortOrder}`;

export class Pagination {
  @ApiPropertyOptional({ description: "The number of items to return", example: 10 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(250)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: "The number of items to skip", example: 0 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(0)
  @Max(250)
  @IsOptional()
  offset?: number;
}

const DEFAULT_TAKE = 250;
const DEFAULT_SKIP = 0;

export class SkipTakePagination {
  @ApiPropertyOptional({
    description: "Maximum number of items to return",
    example: 25,
    default: DEFAULT_TAKE,
    minimum: 1,
    maximum: DEFAULT_TAKE,
  })
  @Transform(({ value }: { value: string }) => (value ? parseInt(value) : DEFAULT_TAKE))
  @IsNumber()
  @Min(1)
  @Max(DEFAULT_TAKE)
  @IsOptional()
  take: number = DEFAULT_TAKE;

  @ApiPropertyOptional({
    description: "Number of items to skip",
    example: 0,
    default: DEFAULT_SKIP,
    minimum: 0,
  })
  @Transform(({ value }: { value: string }) => (value ? parseInt(value) : DEFAULT_SKIP))
  @IsNumber()
  @Min(0)
  @IsOptional()
  skip: number = DEFAULT_SKIP;
}

import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, Min } from "class-validator";

export class PaginationMetaDto {
  @ApiProperty({
    description: "The total number of items available across all pages, matching the query criteria.",
    example: 123,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  totalItems!: number;

  @ApiProperty({
    description:
      "The number of items remaining to be fetched *after* the current page. Calculated as: `totalItems - (skip + itemsPerPage)`.",
    example: 103, // e.g., if totalItems=123, skip=10, itemsPerPage=10 -> 123 - (10 + 10) = 103
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  remainingItems!: number;

  @ApiProperty({
    description: "The number of items returned in the current page.",
    example: 10,
  })
  @IsInt()
  @Min(0)
  returnedItems!: number;

  @ApiProperty({
    description: "The maximum number of items requested per page.",
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1) // Typically, you request at least 1 item per page
  itemsPerPage!: number;

  @ApiProperty({
    description: "The current page number being returned.",
    example: 2, // e.g., if skip=10, itemsPerPage=10 -> page 2
    minimum: 1,
  })
  @IsInt()
  @Min(1) // Page numbers usually start from 1
  currentPage!: number;

  @ApiProperty({
    description: "The total number of pages available.",
    example: 13, // e.g., if totalItems=123, itemsPerPage=10 -> 13 pages
    minimum: 0, // Can be 0 if totalItems is 0
  })
  @IsInt()
  @Min(0)
  totalPages!: number;

  @ApiProperty({
    description: "Indicates if there is a subsequent page available after the current one.",
    example: true,
  })
  @IsBoolean()
  hasNextPage!: boolean;

  @ApiProperty({
    description: "Indicates if there is a preceding page available before the current one.",
    example: true,
  })
  @IsBoolean()
  hasPreviousPage!: boolean;
}

import { ApiProperty, ApiExtraModels, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, Min, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import {
  BookingOutput_2024_08_13,
  GetRecurringSeatedBookingOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
} from "@calcom/platform-types";

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

@ApiExtraModels(
  BookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  GetRecurringSeatedBookingOutput_2024_08_13
)
export class GetBookingsOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: "array",
    items: {
      oneOf: [
        { $ref: getSchemaPath(BookingOutput_2024_08_13) },
        { $ref: getSchemaPath(RecurringBookingOutput_2024_08_13) },
        { $ref: getSchemaPath(GetSeatedBookingOutput_2024_08_13) },
        { $ref: getSchemaPath(GetRecurringSeatedBookingOutput_2024_08_13) },
      ],
    },
    description:
      "Array of booking data, which can contain either BookingOutput objects or RecurringBookingOutput objects",
  })
  data!: (
    | BookingOutput_2024_08_13
    | RecurringBookingOutput_2024_08_13
    | GetSeatedBookingOutput_2024_08_13
    | GetRecurringSeatedBookingOutput_2024_08_13
  )[];
  error?: Error;

  @ApiProperty({ type: () => PaginationMetaDto }) // Crucial for Swagger
  @Type(() => PaginationMetaDto)
  @ValidateNested()
  pagination!: PaginationMetaDto;
}

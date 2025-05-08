import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class UpdatedBooking {
  @ApiProperty({ type: Number, example: 123 })
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({ type: String, example: "booking_uid_123" })
  @IsString()
  @Expose()
  uid!: string;

  @ApiProperty({ type: String, example: "Consultation" })
  @IsString()
  @Expose()
  title!: string;

  @ApiProperty({ type: String, example: "Learn how to integrate scheduling into marketplace." })
  @IsString()
  @Expose()
  description!: string | null;

  @ApiProperty({ enum: ["cancelled", "accepted", "rejected", "pending"], example: "accepted" })
  @IsEnum(["cancelled", "accepted", "rejected", "pending"])
  @Expose()
  status!: "cancelled" | "accepted" | "rejected" | "pending";

  @ApiProperty({ type: String, example: "Learn how to integrate scheduling into marketplace." })
  @IsString()
  @Expose()
  location!: string | null;

  @ApiProperty({ type: String, example: "2024-08-13T15:30:00Z" })
  @IsDateString()
  @Expose()
  createdAt!: string;

  @ApiProperty({ type: String, example: "2024-08-13T15:30:00Z" })
  @IsDateString()
  @Expose()
  updatedAt?: string;

  @ApiPropertyOptional({
    type: Object,
    example: { key: "value" },
  })
  @IsObject()
  @IsOptional()
  @Expose()
  metadata?: Record<string, string>;
}

export class UpdateBookingOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => Object)
  data!: UpdatedBooking;
}

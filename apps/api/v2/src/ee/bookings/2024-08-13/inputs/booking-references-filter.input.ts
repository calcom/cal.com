import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class BookingReferencesFilterInput_2024_08_13 {
  @ApiProperty({
    description: "Filter booking references by type",
    required: false,
    example: "zoom",
  })
  @IsOptional()
  @IsString()
  type?: string;
}

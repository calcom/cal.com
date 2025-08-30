import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class Disabled_2024_06_14 {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: "Indicates if the option is disabled",
    example: true,
    default: false,
  })
  disabled!: true;
}

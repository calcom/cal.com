import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class Disabled_2024_06_14 {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description:
      "Only acceptable value for the `disabled` property is `true`. It is used to reset the value of the property for which previously an object containing specific settings was passed.",
    example: true,
  })
  disabled!: true;
}

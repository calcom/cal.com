import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class OptionOutput {
  @Expose()
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: "The ID of the option",
    example: "attr_option_id",
  })
  id!: string;

  @Expose()
  @IsString()
  @ApiProperty({ type: String, required: true, description: "The ID of the attribute", example: "attr_id" })
  attributeId!: string;

  @Expose()
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: "The value of the option",
    example: "option_value",
  })
  value!: string;

  @Expose()
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: "The slug of the option",
    example: "option-slug",
  })
  slug!: string;
}

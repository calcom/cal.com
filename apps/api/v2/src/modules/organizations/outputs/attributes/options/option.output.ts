import { BaseOutputDTO } from "@/modules/organizations/outputs/attributes/base.output";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsEnum, IsBoolean } from "class-validator";

export class OptionOutput {
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: "The ID of the option",
    example: "attr_option_id",
  })
  id!: string;

  @IsString()
  @ApiProperty({ type: String, required: true, description: "The ID of the attribute", example: "attr_id" })
  attributeId!: string;

  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: "The value of the option",
    example: "option_value",
  })
  value!: string;

  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: "The slug of the option",
    example: "option-slug",
  })
  slug!: string;
}

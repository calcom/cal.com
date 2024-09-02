import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsEnum, IsBoolean } from "class-validator";

import { AttributeType } from "@calcom/prisma/client";

export class Attribute {
  @IsString()
  @ApiProperty({ type: String, required: true, description: "The ID of the attribute", example: "attr_123" })
  id!: string;

  @IsInt()
  @ApiProperty({
    type: Number,
    required: true,
    description: "The team ID associated with the attribute",
    example: 1,
  })
  teamId!: number;

  @ApiProperty({
    type: String,
    required: true,
    description: "The type of the attribute",
    enum: AttributeType,
  })
  @IsEnum(AttributeType)
  type!: AttributeType;

  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: "The name of the attribute",
    example: "Attribute Name",
  })
  name!: string;

  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: "The slug of the attribute",
    example: "attribute-name",
  })
  slug!: string;

  @IsBoolean()
  @ApiProperty({
    type: Boolean,
    required: true,
    description: "Whether the attribute is enabled and displayed on their profile",
    example: true,
  })
  enabled!: boolean;

  @IsBoolean()
  @ApiProperty({
    type: Boolean,
    required: false,
    description: "Whether users can edit the relation",
    example: true,
  })
  usersCanEditRelation!: boolean;
}

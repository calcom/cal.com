import { RoutingFormResponseOutput } from "@/modules/organizations/teams/routing-forms/outputs/routing-form-response.output";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class RoutingFormOutput {
  @ApiProperty()
  @IsString()
  @Expose()
  id!: string;

  @ApiProperty()
  @IsString()
  @Expose()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @IsInt()
  @Expose()
  position!: number;

  @ApiProperty()
  @IsBoolean()
  @Expose()
  disabled!: boolean;

  @ApiProperty()
  @IsDate()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @IsDate()
  @Expose()
  updatedAt!: Date;

  @ApiProperty({ type: [RoutingFormResponseOutput] })
  @ValidateNested({ each: true })
  @Type(() => RoutingFormResponseOutput)
  @IsArray()
  @Expose()
  responses!: RoutingFormResponseOutput[];
}

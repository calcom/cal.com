import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

class FormResponseValue {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  label!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Expose()
  identifier?: string;

  @ApiProperty()
  @Expose()
  value!: string | number | string[];
}

export class RoutingFormResponseOutput {
  @ApiProperty()
  @IsInt()
  @Expose()
  id!: string;

  @ApiProperty({
    example: { "f00b26df-f54b-4985-8d98-17c5482c6a24": { label: "participant", value: "bob" } },
  })
  @Expose()
  response!: Record<string, FormResponseValue>;

  @ApiProperty()
  @IsInt()
  @Expose()
  formId!: string;

  @ApiProperty()
  @IsString()
  @Expose()
  formFillerId!: string;

  @ApiProperty()
  @Expose()
  @IsString()
  @IsOptional()
  routedToBookingUid?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Expose()
  chosenRouteId?: string;

  @ApiProperty()
  @Expose()
  @IsDate()
  createdAt!: Date;
}

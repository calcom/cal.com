import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsDate, IsInt, IsString, IsObject } from "class-validator";

export class RoutingFormResponseResponseOutput {
  @ApiProperty()
  @IsString()
  @Expose()
  label!: string;

  @ApiPropertyOptional()
  @IsString()
  @Expose()
  identifier?: string;

  @ApiProperty()
  @IsString()
  @Expose()
  value!: string | number | string[];
}

export class RoutingFormResponseOutput {
  @ApiProperty()
  @IsInt()
  @Expose()
  id!: number;

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
  routedToBookingUid!: string;

  @ApiProperty({
    example: { "f00b26df-f54b-4985-8d98-17c5482c6a24": { label: "participant", value: "mamut" } },
  })
  @IsObject()
  @Expose()
  response!: Record<string, RoutingFormResponseResponseOutput>;

  @ApiProperty()
  @Expose()
  @IsDate()
  createdAt!: Date;
}

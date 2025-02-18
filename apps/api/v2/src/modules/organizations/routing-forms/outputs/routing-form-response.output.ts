import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsDate, IsInt, IsString } from "class-validator";

export class RoutingFormResponseDto {
  @ApiProperty()
  @IsInt()
  @Expose()
  id!: string;

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

  @ApiProperty()
  @Expose()
  @Type(() => Object)
  response!: Record<string, unknown>;

  @ApiProperty()
  @Expose()
  @IsDate()
  createdAt!: Date;
}

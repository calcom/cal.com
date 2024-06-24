import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class GetPublicEventTypeQueryParams_2024_04_15 {
  @Transform(({ value }: { value: string }) => value === "true")
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  isTeamEvent?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  org?: string | null;
}

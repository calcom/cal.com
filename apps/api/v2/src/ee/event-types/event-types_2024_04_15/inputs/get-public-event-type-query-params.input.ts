import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class GetPublicEventTypeQueryParams_2024_04_15 {
  @Transform(({ value }: { value: string }) => value === "true")
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  isTeamEvent?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, nullable: true })
  org?: string | null;
}

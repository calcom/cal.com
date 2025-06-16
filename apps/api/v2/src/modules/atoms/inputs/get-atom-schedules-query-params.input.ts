import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class GetAtomSchedulesQueryParams {
  @IsOptional()
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @ApiPropertyOptional({ type: Number })
  scheduleId?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  isManagedEventType?: boolean;
}

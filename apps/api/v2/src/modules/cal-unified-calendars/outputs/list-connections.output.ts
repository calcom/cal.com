import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { CALENDARS, SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class CalendarConnectionItem {
  @IsString()
  @ApiProperty({
    description: "Stable ID for this calendar connection (use in connection-scoped endpoints)",
    example: "123",
  })
  connectionId!: string;

  @IsEnum(CALENDARS)
  @ApiProperty({
    enum: CALENDARS,
    description: "Calendar provider type",
    example: "google",
  })
  type!: (typeof CALENDARS)[number];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Primary email for this connection (null if unavailable)",
    example: "user@gmail.com",
    nullable: true,
  })
  email?: string | null;
}

export class ListConnectionsData {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarConnectionItem)
  @ApiProperty({ type: [CalendarConnectionItem] })
  connections!: CalendarConnectionItem[];
}

export class ListConnectionsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => ListConnectionsData)
  @ApiProperty({ type: ListConnectionsData })
  data!: ListConnectionsData;
}

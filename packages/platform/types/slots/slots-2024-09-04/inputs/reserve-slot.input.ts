import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsDateString, IsOptional } from "class-validator";

export class ReserveSlotInput_2024_09_04 {
  @IsInt()
  @ApiProperty({ example: 1, description: "The ID of the event type for which booking should be reserved." })
  eventTypeId!: number;

  @IsDateString()
  @ApiProperty()
  @ApiProperty({
    example: "2024-09-04T09:00:00Z",
    description: "ISO 8601 datestring in UTC timezone representing available slot.",
  })
  start!: string;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    example: 5,
    description:
      "For how many minutes the slot should be reserved - for this long time noone else can book this event type at `start` time.",
  })
  duration = 5;
}

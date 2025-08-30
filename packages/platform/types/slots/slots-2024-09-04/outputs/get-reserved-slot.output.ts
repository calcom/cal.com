import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsDateString, IsString, IsInt } from "class-validator";

export class GetReservedSlotOutput_2024_09_04 {
  @IsString()
  @ApiProperty({
    example: "e84be5a3-4696-49e3-acc7-b2f3999c3b94",
    description: "The unique identifier of the reservation.",
  })
  @Expose()
  reservationUid!: string;

  @IsInt()
  @ApiProperty({ example: 1, description: "The ID of the event type for which booking should be reserved." })
  @Expose()
  eventTypeId!: number;

  @IsDateString()
  @ApiProperty({
    example: "2024-09-04T09:00:00Z",
    description: "ISO 8601 datestring in UTC timezone representing available slot.",
  })
  @Expose()
  slotStart!: string;

  @IsDateString()
  @ApiProperty({
    example: "2024-09-04T10:00:00Z",
    description: "ISO 8601 datestring in UTC timezone representing slot end.",
  })
  @Expose()
  slotEnd!: string;

  @IsInt()
  @ApiProperty({
    example: "30",
    description: "Difference in minutes between slotStart and slotEnd.",
  })
  @Expose()
  slotDuration!: number;

  @IsDateString()
  @ApiProperty({
    example: "2023-09-04T10:00:00Z",
    description: "ISO 8601 datestring in UTC timezone representing time until which the slot is reserved.",
  })
  @Expose()
  reservationUntil!: string;
}

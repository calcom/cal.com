import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsDateString, IsInt, IsString } from "class-validator";

export class ReserveSlotOutput_2024_09_04 {
  @IsInt()
  @ApiProperty({ example: 1, description: "The ID of the event type for which slot was reserved." })
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
    description:
      "By default slot duration is equal to event type length, but if you want to reserve a slot for an event type that has a variable length you can specify it here. If you don't have this set explicitly that event type can have one of many lengths you can omit this.",
  })
  @Expose()
  slotDuration!: number;

  @IsString()
  @ApiProperty({
    example: "e84be5a3-4696-49e3-acc7-b2f3999c3b94",
    description: "The unique identifier of the reservation. Use it to update, get or delete the reservation.",
  })
  @Expose()
  reservationUid!: string;

  @IsInt()
  @ApiProperty({
    example: 5,
    description:
      "For how many minutes the slot is reserved - for this long time noone else can book this event type at `start` time.",
  })
  @Expose()
  reservationDuration!: number;

  @IsDateString()
  @ApiProperty({
    example: "2023-09-04T10:00:00Z",
    description: "ISO 8601 datestring in UTC timezone representing time until which the slot is reserved.",
  })
  @Expose()
  reservationUntil!: string;
}

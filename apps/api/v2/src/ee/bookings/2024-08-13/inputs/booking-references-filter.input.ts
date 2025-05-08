import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

export const BookingReferenceType = [
  "google_calendar",
  "office365_calendar",
  "daily_video",
  "google_video",
  "office365_video",
  "zoom_video",
] as const;

export class BookingReferencesFilterInput_2024_08_13 {
  @ApiProperty({
    description: "Filter booking references by type",
    required: false,
    enum: BookingReferenceType,
    example: "google_calendar",
  })
  @IsOptional()
  @IsIn(BookingReferenceType)
  type?: (typeof BookingReferenceType)[number];
}

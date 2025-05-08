import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

export enum BookingReferenceType {
  GOOGLE_CALENDAR = "google_calendar",
  OFFICE365_CALENDAR = "office365_calendar",
  DAILY_VIDEO = "daily_video",
  GOOGLE_VIDEO = "google_video",
  OFFICE365_VIDEO = "office365_video",
  ZOOM_VIDEO = "zoom_video",
}

export class BookingReferencesFilterInput_2024_08_13 {
  @ApiProperty({
    description: "Filter booking references by type",
    required: false,
    enum: BookingReferenceType,
    example: "google_calendar",
  })
  @IsOptional()
  @IsEnum(BookingReferenceType)
  type?: BookingReferenceType;
}

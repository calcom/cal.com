import { ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

import {
  BookingInputAddressLocation_2024_08_13,
  BookingInputAttendeeAddressLocation_2024_08_13,
  BookingInputAttendeeDefinedLocation_2024_08_13,
  BookingInputAttendeePhoneLocation_2024_08_13,
  BookingInputIntegrationLocation_2024_08_13,
  BookingInputLinkLocation_2024_08_13,
  BookingInputPhoneLocation_2024_08_13,
  BookingInputOrganizersDefaultAppLocation_2024_08_13,
  ValidateBookingLocation_2024_08_13,
} from "./location.input";
import type { BookingInputLocation_2024_08_13 } from "./location.input";

export class UpdateBookingLocationInput_2024_08_13 {
  @IsOptional()
  @ValidateBookingLocation_2024_08_13()
  @ApiPropertyOptional({
    description:
      "One of the event type locations. If instead of passing one of the location objects as required by schema you are still passing a string please use an object.",
    oneOf: [
      { $ref: getSchemaPath(BookingInputAddressLocation_2024_08_13) },
      { $ref: getSchemaPath(BookingInputAttendeeAddressLocation_2024_08_13) },
      { $ref: getSchemaPath(BookingInputAttendeeDefinedLocation_2024_08_13) },
      { $ref: getSchemaPath(BookingInputAttendeePhoneLocation_2024_08_13) },
      { $ref: getSchemaPath(BookingInputIntegrationLocation_2024_08_13) },
      { $ref: getSchemaPath(BookingInputLinkLocation_2024_08_13) },
      { $ref: getSchemaPath(BookingInputPhoneLocation_2024_08_13) },
      { $ref: getSchemaPath(BookingInputOrganizersDefaultAppLocation_2024_08_13) },
    ],
  })
  location?: BookingInputLocation_2024_08_13;
}

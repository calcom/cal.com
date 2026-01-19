import { ApiExtraModels, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { IsOptional } from "class-validator";
import { IsString, MinLength, IsUrl, IsPhoneNumber, IsDefined } from "class-validator";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { registerDecorator, validate, ValidatorConstraint } from "class-validator";

import {
  BookingInputAddressLocation_2024_08_13,
  BookingInputAttendeeAddressLocation_2024_08_13,
  BookingInputAttendeeDefinedLocation_2024_08_13,
  BookingInputAttendeePhoneLocation_2024_08_13,
  BookingInputLinkLocation_2024_08_13,
  BookingInputPhoneLocation_2024_08_13,
} from "./location.input";

export class UpdateInputAddressLocation_2024_08_13 extends BookingInputAddressLocation_2024_08_13 {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @DocsProperty({ example: "123 Example St, City, Country" })
  address!: string;
}

export class UpdateBookingInputAttendeeAddressLocation_2024_08_13 extends BookingInputAttendeeAddressLocation_2024_08_13 {}

export class UpdateBookingInputAttendeeDefinedLocation_2024_08_13 extends BookingInputAttendeeDefinedLocation_2024_08_13 {}

export class UpdateBookingInputAttendeePhoneLocation_2024_08_13 extends BookingInputAttendeePhoneLocation_2024_08_13 {}

export class UpdateBookingInputLinkLocation_2024_08_13 extends BookingInputLinkLocation_2024_08_13 {
  @IsDefined()
  @IsUrl()
  @DocsProperty({ example: "https://meet.google.com/txi-fein-xyz" })
  link!: string;
}

export class UpdateBookingInputPhoneLocation_2024_08_13 extends BookingInputPhoneLocation_2024_08_13 {
  @IsDefined()
  @IsPhoneNumber()
  @DocsProperty({ example: "+37120993151" })
  phone!: string;
}

export type UpdateBookingInputLocation_2024_08_13 =
  | UpdateInputAddressLocation_2024_08_13
  | UpdateBookingInputAttendeeAddressLocation_2024_08_13
  | UpdateBookingInputAttendeeDefinedLocation_2024_08_13
  | UpdateBookingInputAttendeePhoneLocation_2024_08_13
  | UpdateBookingInputLinkLocation_2024_08_13
  | UpdateBookingInputPhoneLocation_2024_08_13;

@ValidatorConstraint({ async: true })
class UpdateBookingInputLocationValidator_2024_08_13 implements ValidatorConstraintInterface {
  private validationMessage = "";

  private classTypeMap: { [key: string]: new () => UpdateBookingInputLocation_2024_08_13 } = {
    address: UpdateInputAddressLocation_2024_08_13,
    attendeeAddress: UpdateBookingInputAttendeeAddressLocation_2024_08_13,
    attendeeDefined: UpdateBookingInputAttendeeDefinedLocation_2024_08_13,
    attendeePhone: UpdateBookingInputAttendeePhoneLocation_2024_08_13,
    link: UpdateBookingInputLinkLocation_2024_08_13,
    phone: UpdateBookingInputPhoneLocation_2024_08_13,
  };

  async validate(location: { type: string }) {
    const { type } = location;
    if (!type) {
      this.validationMessage = `UpdateBookingInputLocationValidator_2024_08_13 - Booking 'location' must have a 'type' property.`;
      return false;
    }

    const ClassType = this.classTypeMap[type];
    if (!ClassType) {
      this.validationMessage = `UpdateBookingInputLocationValidator_2024_08_13 - Unsupported booking location type '${type}'. Valid types are address, link, phone, attendeePhone, attendeeAddress, and attendeeDefined.`;
      return false;
    }

    const instance = plainToInstance(ClassType, location);
    const errors = await validate(instance, { skipMissingProperties: false });
    if (errors.length > 0) {
      const message = errors.flatMap((error) => Object.values(error.constraints || {})).join(", ");
      this.validationMessage = `UpdateBookingInputLocationValidator_2024_08_13 - Validation failed for ${type} location: ${message}`;
      return false;
    }

    return true;
  }

  defaultMessage() {
    return (
      this.validationMessage ||
      `UpdateBookingInputLocationValidator_2024_08_13 - Validation failed for one or more location entries.`
    );
  }
}

export function ValidateUpdateBookingLocation_2024_08_13(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateUpdateLocation",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new UpdateBookingInputLocationValidator_2024_08_13(),
    });
  };
}

@ApiExtraModels(
  UpdateInputAddressLocation_2024_08_13,
  UpdateBookingInputAttendeeAddressLocation_2024_08_13,
  UpdateBookingInputAttendeeDefinedLocation_2024_08_13,
  UpdateBookingInputAttendeePhoneLocation_2024_08_13,
  UpdateBookingInputLinkLocation_2024_08_13,
  UpdateBookingInputPhoneLocation_2024_08_13
)
export class UpdateBookingLocationInput_2024_08_13 {
  @IsOptional()
  @ValidateUpdateBookingLocation_2024_08_13()
  @ApiPropertyOptional({
    description:
      "One of the event type locations. If instead of passing one of the location objects as required by schema you are still passing a string please use an object.",
    oneOf: [
      { $ref: getSchemaPath(UpdateInputAddressLocation_2024_08_13) },
      { $ref: getSchemaPath(UpdateBookingInputAttendeeAddressLocation_2024_08_13) },
      { $ref: getSchemaPath(UpdateBookingInputAttendeeDefinedLocation_2024_08_13) },
      { $ref: getSchemaPath(UpdateBookingInputAttendeePhoneLocation_2024_08_13) },
      { $ref: getSchemaPath(UpdateBookingInputLinkLocation_2024_08_13) },
      { $ref: getSchemaPath(UpdateBookingInputPhoneLocation_2024_08_13) },
    ],
  })
  location?: UpdateBookingInputLocation_2024_08_13;
}

import { BadRequestException } from "@nestjs/common";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { IsString, IsIn, IsPhoneNumber } from "class-validator";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { registerDecorator, validate, ValidatorConstraint } from "class-validator";

export const inputLocations = [
  "address",
  "link",
  "integration",
  "phone",
  "attendeeAddress",
  "attendeePhone",
  "attendeeDefined",
] as const;

export class BookingInputAddressLocation_2024_08_13 {
  @IsIn(inputLocations)
  @DocsProperty({
    example: "address",
    description: "only allowed value for type is `address` - it refers to address defined by the organizer.",
  })
  type!: "address";
}

export class BookingInputLinkLocation_2024_08_13 {
  @IsIn(inputLocations)
  @DocsProperty({
    example: "link",
    description: "only allowed value for type is `link` - it refers to link defined by the organizer.",
  })
  type!: "link";
}

export const supportedIntegrations = ["cal-video", "google-meet"] as const;
export type Integration_2024_08_13 = (typeof supportedIntegrations)[number];

export class BookingInputIntegrationLocation_2024_08_13 {
  @IsIn(inputLocations)
  @DocsProperty({ example: "integration", description: "only allowed value for type is `integration`" })
  type!: "integration";

  @IsIn(supportedIntegrations)
  @DocsProperty({ example: supportedIntegrations[0], enum: supportedIntegrations })
  integration!: Integration_2024_08_13;
}

export class BookingInputPhoneLocation_2024_08_13 {
  @IsIn(inputLocations)
  @DocsProperty({
    example: "phone",
    description: "only allowed value for type is `phone` - it refers to phone defined by the organizer.",
  })
  type!: "phone";
}

export class BookingInputAttendeeAddressLocation_2024_08_13 {
  @IsIn(inputLocations)
  @DocsProperty({
    example: "attendeeAddress",
    description: "only allowed value for type is `attendeeAddress`",
  })
  type!: "attendeeAddress";

  @IsString()
  @DocsProperty({ example: "123 Example St, City, Country" })
  address!: string;
}
export class BookingInputAttendeePhoneLocation_2024_08_13 {
  @IsIn(inputLocations)
  @DocsProperty({ example: "attendeePhone", description: "only allowed value for type is `attendeePhone`" })
  type!: "attendeePhone";

  @IsPhoneNumber()
  @DocsProperty({ example: "+37120993151" })
  phone!: string;
}

export class BookingInputAttendeeDefinedLocation_2024_08_13 {
  @IsIn(inputLocations)
  @DocsProperty({
    example: "attendeeDefined",
    description: "only allowed value for type is `attendeeDefined`",
  })
  type!: "attendeeDefined";

  @IsString()
  @DocsProperty({ example: "321 Example St, City, Country" })
  location!: string;
}

export type BookingInputLocation_2024_08_13 =
  | BookingInputAddressLocation_2024_08_13
  | BookingInputLinkLocation_2024_08_13
  | BookingInputIntegrationLocation_2024_08_13
  | BookingInputPhoneLocation_2024_08_13
  | BookingInputAttendeeAddressLocation_2024_08_13
  | BookingInputAttendeePhoneLocation_2024_08_13
  | BookingInputAttendeeDefinedLocation_2024_08_13;

@ValidatorConstraint({ async: true })
class InputLocationValidator_2024_08_13 implements ValidatorConstraintInterface {
  private classTypeMap: { [key: string]: new () => BookingInputLocation_2024_08_13 } = {
    address: BookingInputAddressLocation_2024_08_13,
    link: BookingInputLinkLocation_2024_08_13,
    integration: BookingInputIntegrationLocation_2024_08_13,
    phone: BookingInputPhoneLocation_2024_08_13,
    attendeePhone: BookingInputAttendeePhoneLocation_2024_08_13,
    attendeeAddress: BookingInputAttendeeAddressLocation_2024_08_13,
    attendeeDefined: BookingInputAttendeeDefinedLocation_2024_08_13,
  };

  async validate(location: { type: string } | string) {
    if (typeof location === "string") {
      // note(Lauris): this is for backwards compatibility because before switching to booking location objects
      // we only received a string. If someone is complaining that their location is not displaying as a URL
      // or whatever check that they are not providing a string for bookign location but one of the input objects.
      return true;
    }

    const { type } = location;
    if (!type) {
      throw new BadRequestException(`Booking 'location' must have a 'type' property.`);
    }

    const ClassType = this.classTypeMap[type];
    if (!ClassType) {
      throw new BadRequestException(
        `Unsupported booking location type '${type}'. Valid types are address, link, integration, and phone.`
      );
    }

    const instance = plainToInstance(ClassType, location);
    const errors = await validate(instance);
    if (errors.length > 0) {
      const message = errors.flatMap((error) => Object.values(error.constraints || {})).join(", ");
      throw new BadRequestException(`Validation failed for ${type} location: ${message}`);
    }

    return true;
  }

  defaultMessage() {
    return `Validation failed for one or more location entries.`;
  }
}

export function ValidateBookingLocation_2024_08_13(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateLocation",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new InputLocationValidator_2024_08_13(),
    });
  };
}

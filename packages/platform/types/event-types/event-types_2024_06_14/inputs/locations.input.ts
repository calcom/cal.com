import { BadRequestException } from "@nestjs/common";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { IsString, IsUrl, IsIn, IsPhoneNumber, IsBoolean } from "class-validator";
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

export class InputAddressLocation_2024_06_14 {
  @IsIn(inputLocations)
  @DocsProperty({ example: "address", description: "only allowed value for type is `address`" })
  type!: "address";

  @IsString()
  @DocsProperty({ example: "123 Example St, City, Country" })
  address!: string;

  @IsBoolean()
  @DocsProperty()
  public!: boolean;
}

export class InputLinkLocation_2024_06_14 {
  @IsIn(inputLocations)
  @DocsProperty({ example: "link", description: "only allowed value for type is `link`" })
  type!: "link";

  @IsUrl()
  @DocsProperty({ example: "https://customvideo.com/join/123456" })
  link!: string;

  @IsBoolean()
  @DocsProperty()
  public!: boolean;
}

export const supportedIntegrations = ["cal-video", "google-meet"] as const;
export type Integration_2024_06_14 = (typeof supportedIntegrations)[number];

export class InputIntegrationLocation_2024_06_14 {
  @IsIn(inputLocations)
  @DocsProperty({ example: "integration", description: "only allowed value for type is `integration`" })
  type!: "integration";

  @IsIn(supportedIntegrations)
  @DocsProperty({ example: supportedIntegrations[0], enum: supportedIntegrations })
  integration!: Integration_2024_06_14;
}

export class InputPhoneLocation_2024_06_14 {
  @IsIn(inputLocations)
  @DocsProperty({ example: "phone", description: "only allowed value for type is `phone`" })
  type!: "phone";

  @IsPhoneNumber()
  @DocsProperty({ example: "+37120993151" })
  phone!: string;

  @IsBoolean()
  @DocsProperty()
  public!: boolean;
}

export class InputAttendeeAddressLocation_2024_06_14 {
  @IsIn(inputLocations)
  @DocsProperty({
    example: "attendeeAddress",
    description: "only allowed value for type is `attendeeAddress`",
  })
  type!: "attendeeAddress";
}
export class InputAttendeePhoneLocation_2024_06_14 {
  @IsIn(inputLocations)
  @DocsProperty({ example: "attendeePhone", description: "only allowed value for type is `attendeePhone`" })
  type!: "attendeePhone";
}

export class InputAttendeeDefinedLocation_2024_06_14 {
  @IsIn(inputLocations)
  @DocsProperty({
    example: "attendeeDefined",
    description: "only allowed value for type is `attendeeDefined`",
  })
  type!: "attendeeDefined";
}

export type InputLocation_2024_06_14 =
  | InputAddressLocation_2024_06_14
  | InputLinkLocation_2024_06_14
  | InputIntegrationLocation_2024_06_14
  | InputPhoneLocation_2024_06_14
  | InputAttendeeAddressLocation_2024_06_14
  | InputAttendeePhoneLocation_2024_06_14
  | InputAttendeeDefinedLocation_2024_06_14;

@ValidatorConstraint({ async: true })
class InputLocationValidator_2024_06_14 implements ValidatorConstraintInterface {
  private classTypeMap: { [key: string]: new () => InputLocation_2024_06_14 } = {
    address: InputAddressLocation_2024_06_14,
    link: InputLinkLocation_2024_06_14,
    integration: InputIntegrationLocation_2024_06_14,
    phone: InputPhoneLocation_2024_06_14,
    attendeePhone: InputAttendeePhoneLocation_2024_06_14,
    attendeeAddress: InputAttendeeAddressLocation_2024_06_14,
    attendeeDefined: InputAttendeeDefinedLocation_2024_06_14,
  };

  async validate(locations: { type: string }[]) {
    if (!Array.isArray(locations)) {
      throw new BadRequestException(`'locations' must be an array.`);
    }

    if (!locations.length) {
      throw new BadRequestException(`'locations' must contain at least 1 location.`);
    }

    for (const location of locations) {
      const { type } = location;
      if (!type) {
        throw new BadRequestException(`Each object in 'locations' must have a 'type' property.`);
      }

      const ClassType = this.classTypeMap[type];
      if (!ClassType) {
        throw new BadRequestException(
          `Unsupported location type '${type}'. Valid types are address, link, integration, and phone.`
        );
      }

      const instance = plainToInstance(ClassType, location);
      const errors = await validate(instance);
      if (errors.length > 0) {
        const message = errors.flatMap((error) => Object.values(error.constraints || {})).join(", ");
        throw new BadRequestException(`Validation failed for ${type} location: ${message}`);
      }
    }

    return true;
  }

  defaultMessage() {
    return `Validation failed for one or more location entries.`;
  }
}

export function ValidateLocations_2024_06_14(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateLocation",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new InputLocationValidator_2024_06_14(),
    });
  };
}

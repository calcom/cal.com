import { BadRequestException } from "@nestjs/common";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { IsString, IsUrl, IsIn, IsPhoneNumber } from "class-validator";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { registerDecorator, validate, ValidatorConstraint } from "class-validator";

const locations = ["address", "link", "integration", "phone"] as const;

export class AddressLocation {
  @IsIn(locations)
  type!: "address";

  @IsString()
  @DocsProperty({ example: "123 Example St, City, Country" })
  address!: string;
}

export class LinkLocation {
  @IsIn(locations)
  type!: "link";

  @IsUrl()
  @DocsProperty({ example: "https://customvideo.com/join/123456" })
  link!: string;
}

export class IntegrationLocation {
  @IsIn(locations)
  type!: "integration";

  @IsIn(["cal-video"])
  @DocsProperty({ example: "cal-video" })
  integration!: "cal-video";
}

export class PhoneLocation {
  @IsIn(locations)
  type!: "phone";

  @IsPhoneNumber()
  @DocsProperty({ example: "+37120993151" })
  phone!: string;
}

export type Location = AddressLocation | LinkLocation | IntegrationLocation | PhoneLocation;

@ValidatorConstraint({ async: true })
class LocationValidator implements ValidatorConstraintInterface {
  private classTypeMap: { [key: string]: new () => Location } = {
    address: AddressLocation,
    link: LinkLocation,
    integration: IntegrationLocation,
    phone: PhoneLocation,
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

export function ValidateLocations(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateLocation",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new LocationValidator(),
    });
  };
}

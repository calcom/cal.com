import { BadRequestException } from "@nestjs/common";
import { ApiPropertyOptional, ApiProperty as DocsProperty } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { IsUrl, IsIn, IsOptional, IsNumber, IsString } from "class-validator";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { registerDecorator, validate, ValidatorConstraint } from "class-validator";

import {
  InputAddressLocation_2024_06_14,
  InputAttendeeAddressLocation_2024_06_14,
  InputAttendeeDefinedLocation_2024_06_14,
  InputAttendeePhoneLocation_2024_06_14,
  InputLinkLocation_2024_06_14,
  eventTypeInputLocations,
  InputPhoneLocation_2024_06_14,
} from "../inputs";

const outputLocations = [...eventTypeInputLocations, "conferencing", "unknown"] as const;

export class OutputAddressLocation_2024_06_14 extends InputAddressLocation_2024_06_14 {}
export class OutputLinkLocation_2024_06_14 extends InputLinkLocation_2024_06_14 {}
export class OutputPhoneLocation_2024_06_14 extends InputPhoneLocation_2024_06_14 {}
export class OutputAttendeeAddressLocation_2024_06_14 extends InputAttendeeAddressLocation_2024_06_14 {}
export class OutputAttendeePhoneLocation_2024_06_14 extends InputAttendeePhoneLocation_2024_06_14 {}
export class OutputAttendeeDefinedLocation_2024_06_14 extends InputAttendeeDefinedLocation_2024_06_14 {}

const integrationsValues = [
  "cal-video",
  "google-meet",
  "zoom",
  "whereby-video",
  "whatsapp-video",
  "webex-video",
  "telegram-video",
  "tandem",
  "sylaps-video",
  "skype-video",
  "sirius-video",
  "signal-video",
  "shimmer-video",
  "salesroom-video",
  "roam-video",
  "riverside-video",
  "ping-video",
  "office365-video",
  "mirotalk-video",
  "jitsi",
  "jelly-video",
  "jelly-conferencing",
  "huddle",
  "facetime-video",
  "element-call-video",
  "eightxeight-video",
  "discord-video",
  "demodesk-video",
  "campfire-video",
] as const;
export type OutputIntegration_2024_06_14 = (typeof integrationsValues)[number];

export class OutputIntegrationLocation_2024_06_14 {
  @IsIn(outputLocations)
  @DocsProperty({
    example: "integration",
    description: "Only allowed value for type is `integration`",
  })
  type!: "integration";

  @IsIn(integrationsValues)
  @DocsProperty({ example: integrationsValues[0], enum: integrationsValues })
  integration!: OutputIntegration_2024_06_14;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({
    type: String,
    example: "https://example.com",
  })
  link?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: "Credential ID associated with the integration",
  })
  credentialId?: number;
}

export class OutputOrganizersDefaultAppLocation_2024_06_14 {
  @IsIn(outputLocations)
  @DocsProperty({
    example: "organizersDefaultApp",
    description: "only allowed value for type is `organizersDefaultApp`",
  })
  type!: "organizersDefaultApp";
}

export class OutputUnknownLocation_2024_06_14 {
  @IsIn(outputLocations)
  @DocsProperty({ example: "unknown", description: "only allowed value for type is `unknown`" })
  type!: "unknown";

  @IsString()
  @DocsProperty()
  location!: string;
}

export type OutputLocation_2024_06_14 =
  | OutputAddressLocation_2024_06_14
  | OutputLinkLocation_2024_06_14
  | OutputIntegrationLocation_2024_06_14
  | OutputPhoneLocation_2024_06_14
  | OutputAttendeeAddressLocation_2024_06_14
  | OutputAttendeePhoneLocation_2024_06_14
  | OutputAttendeeDefinedLocation_2024_06_14
  | OutputOrganizersDefaultAppLocation_2024_06_14
  | OutputUnknownLocation_2024_06_14;

@ValidatorConstraint({ async: true })
class OutputLocationValidator_2024_06_14 implements ValidatorConstraintInterface {
  private classTypeMap: { [key: string]: new () => OutputLocation_2024_06_14 } = {
    address: OutputAddressLocation_2024_06_14,
    link: OutputLinkLocation_2024_06_14,
    integration: OutputIntegrationLocation_2024_06_14,
    phone: OutputPhoneLocation_2024_06_14,
    attendeePhone: OutputAttendeePhoneLocation_2024_06_14,
    attendeeAddress: OutputAttendeeAddressLocation_2024_06_14,
    attendeeDefined: OutputAttendeeDefinedLocation_2024_06_14,
    conferencing: OutputOrganizersDefaultAppLocation_2024_06_14,
    unknown: OutputUnknownLocation_2024_06_14,
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
        throw new BadRequestException(`Unsupported output type '${type}'.`);
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

export function ValidateOutputLocations_2024_06_14(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateLocation",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new OutputLocationValidator_2024_06_14(),
    });
  };
}

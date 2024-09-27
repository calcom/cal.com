import { BadRequestException } from "@nestjs/common";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { IsBoolean, IsString } from "class-validator";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { registerDecorator, validate, ValidatorConstraint } from "class-validator";

import {
  PhoneFieldInput_2024_06_14,
  AddressFieldInput_2024_06_14,
  TextFieldInput_2024_06_14,
  NumberFieldInput_2024_06_14,
  TextAreaFieldInput_2024_06_14,
  SelectFieldInput_2024_06_14,
  MultiSelectFieldInput_2024_06_14,
  MultiEmailFieldInput_2024_06_14,
  CheckboxGroupFieldInput_2024_06_14,
  RadioGroupFieldInput_2024_06_14,
  BooleanFieldInput_2024_06_14,
} from "../inputs";

export class NameDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always true because it's a default field",
    example: true,
    default: true,
  })
  isDefault = true;

  @IsString()
  @DocsProperty({
    default: "name",
  })
  slug!: "name";

  @IsString()
  @DocsProperty({
    default: "name",
  })
  type!: "name";

  @IsBoolean()
  @DocsProperty()
  required!: true;
}

export class EmailDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always true because it's a default field",
    example: true,
    default: true,
  })
  isDefault = true;

  @IsString()
  @DocsProperty({
    default: "email",
  })
  slug!: "email";

  @IsString()
  @DocsProperty({
    default: "email",
  })
  type!: "email";

  @IsBoolean()
  @DocsProperty()
  required!: true;
}

export class LocationDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always true because it's a default field",
    example: true,
    default: true,
  })
  isDefault = true;

  @IsString()
  @DocsProperty({
    default: "location",
  })
  slug!: "location";

  @IsString()
  @DocsProperty({
    default: "radioInput",
  })
  type!: "radioInput";

  @IsBoolean()
  @DocsProperty()
  required!: false;
}

export class RescheduleReasonDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always true because it's a default field",
    example: true,
    default: true,
  })
  isDefault = true;

  @IsString()
  @DocsProperty({
    default: "rescheduleReason",
  })
  slug!: "rescheduleReason";

  @IsString()
  @DocsProperty({
    default: "textarea",
  })
  type!: "textarea";

  @IsBoolean()
  @DocsProperty()
  required!: false;
}

export class TitleDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always true because it's a default field",
    example: true,
    default: true,
  })
  isDefault = true;

  @IsString()
  @DocsProperty({
    default: "title",
  })
  slug!: "title";

  @IsString()
  @DocsProperty({
    default: "text",
  })
  type!: "text";

  @IsBoolean()
  @DocsProperty()
  required!: true;
}

export class NotesDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always true because it's a default field",
    example: true,
    default: true,
  })
  isDefault = true;

  @IsString()
  @DocsProperty({
    default: "notes",
  })
  slug!: "notes";

  @IsString()
  @DocsProperty({
    default: "textarea",
  })
  type!: "textarea";

  @IsBoolean()
  @DocsProperty()
  required!: false;
}

export class GuestsDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always true because it's a default field",
    example: true,
    default: true,
  })
  isDefault = true;

  @IsString()
  @DocsProperty({
    default: "guests",
  })
  slug!: "guests";

  @IsString()
  @DocsProperty({
    default: "multiemail",
  })
  type!: "multiemail";

  @IsBoolean()
  @DocsProperty()
  required!: false;
}

export class PhoneFieldOutput_2024_06_14 extends PhoneFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class AddressFieldOutput_2024_06_14 extends AddressFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class TextFieldOutput_2024_06_14 extends TextFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class NumberFieldOutput_2024_06_14 extends NumberFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class TextAreaFieldOutput_2024_06_14 extends TextAreaFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class SelectFieldOutput_2024_06_14 extends SelectFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class MultiSelectFieldOutput_2024_06_14 extends MultiSelectFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class MultiEmailFieldOutput_2024_06_14 extends MultiEmailFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class CheckboxGroupFieldOutput_2024_06_14 extends CheckboxGroupFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class RadioGroupFieldOutput_2024_06_14 extends RadioGroupFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export class BooleanFieldOutput_2024_06_14 extends BooleanFieldInput_2024_06_14 {
  @IsBoolean()
  @DocsProperty({
    description: "This property is always false because it's not default field but custom field",
    example: false,
    default: false,
  })
  isDefault = false;
}

export type DefaultFieldOutput_2024_06_14 =
  | NameDefaultFieldOutput_2024_06_14
  | EmailDefaultFieldOutput_2024_06_14
  | LocationDefaultFieldOutput_2024_06_14
  | RescheduleReasonDefaultFieldOutput_2024_06_14
  | TitleDefaultFieldOutput_2024_06_14
  | NotesDefaultFieldOutput_2024_06_14
  | GuestsDefaultFieldOutput_2024_06_14;

export type CustomFieldOutput_2024_06_14 =
  | PhoneFieldOutput_2024_06_14
  | AddressFieldOutput_2024_06_14
  | TextFieldOutput_2024_06_14
  | NumberFieldOutput_2024_06_14
  | TextAreaFieldOutput_2024_06_14
  | SelectFieldOutput_2024_06_14
  | MultiSelectFieldOutput_2024_06_14
  | MultiEmailFieldOutput_2024_06_14
  | CheckboxGroupFieldOutput_2024_06_14
  | RadioGroupFieldOutput_2024_06_14
  | BooleanFieldOutput_2024_06_14;

export type OutputBookingField_2024_06_14 = DefaultFieldOutput_2024_06_14 | CustomFieldOutput_2024_06_14;

@ValidatorConstraint({ async: true })
class OutputBookingFieldValidator_2024_06_14 implements ValidatorConstraintInterface {
  private defaultOutputNameMap: { [key: string]: new () => DefaultFieldOutput_2024_06_14 } = {
    name: NameDefaultFieldOutput_2024_06_14,
    email: EmailDefaultFieldOutput_2024_06_14,
    location: LocationDefaultFieldOutput_2024_06_14,
    rescheduleReason: RescheduleReasonDefaultFieldOutput_2024_06_14,
    title: TitleDefaultFieldOutput_2024_06_14,
    notes: NotesDefaultFieldOutput_2024_06_14,
    guests: GuestsDefaultFieldOutput_2024_06_14,
  };

  private customOutputTypeMap: { [key: string]: new () => CustomFieldOutput_2024_06_14 } = {
    phone: PhoneFieldOutput_2024_06_14,
    address: AddressFieldOutput_2024_06_14,
    text: TextFieldOutput_2024_06_14,
    number: NumberFieldOutput_2024_06_14,
    textarea: TextAreaFieldOutput_2024_06_14,
    select: SelectFieldOutput_2024_06_14,
    multiselect: MultiSelectFieldOutput_2024_06_14,
    multiemail: MultiEmailFieldOutput_2024_06_14,
    checkbox: CheckboxGroupFieldOutput_2024_06_14,
    radio: RadioGroupFieldOutput_2024_06_14,
    boolean: BooleanFieldOutput_2024_06_14,
  };

  async validate(bookingFields: OutputBookingField_2024_06_14[]) {
    if (!Array.isArray(bookingFields)) {
      throw new BadRequestException(`'bookingFields' must be an array.`);
    }

    if (!bookingFields.length) {
      throw new BadRequestException(`'bookingFields' must contain at least 1 booking field.`);
    }

    const slugs: string[] = [];
    for (const field of bookingFields) {
      const { type, slug } = field;
      if (!type) {
        throw new BadRequestException(`Each booking field must have a 'type' property.`);
      }

      if (!slug) {
        throw new BadRequestException(`Each booking field must have a 'slug' property.`);
      }

      if (slugs.includes(slug)) {
        throw new BadRequestException(
          `Duplicate bookingFields slug '${slug}' found. All bookingFields slugs must be unique.`
        );
      }
      slugs.push(slug);

      if (this.isDefaultField(field)) {
        await this.validateDefaultField(field);
      } else {
        await this.validateCustomField(field);
      }
    }

    return true;
  }

  isDefaultField(field: OutputBookingField_2024_06_14): field is DefaultFieldOutput_2024_06_14 {
    return field.isDefault === true;
  }

  async validateDefaultField(field: DefaultFieldOutput_2024_06_14) {
    const ClassType = this.defaultOutputNameMap[field.slug];
    if (!ClassType) {
      throw new BadRequestException(`Unsupported booking field slgu '${field.slug}'.`);
    }

    const instance = plainToInstance(ClassType, field);
    const errors = await validate(instance);
    if (errors.length > 0) {
      const message = errors.flatMap((error) => Object.values(error.constraints || {})).join(", ");
      throw new BadRequestException(`Validation failed for ${field.slug} booking field: ${message}`);
    }
  }

  async validateCustomField(field: CustomFieldOutput_2024_06_14) {
    const ClassType = this.customOutputTypeMap[field.type];
    if (!ClassType) {
      throw new BadRequestException(`Unsupported booking field type '${field.type}'.`);
    }

    const instance = plainToInstance(ClassType, field);
    const errors = await validate(instance);
    if (errors.length > 0) {
      const message = errors.flatMap((error) => Object.values(error.constraints || {})).join(", ");
      throw new BadRequestException(`Validation failed for ${field.type} booking field: ${message}`);
    }
  }

  defaultMessage() {
    return `Validation failed for one or more booking fields.`;
  }
}

export function ValidateOutputBookingFields_2024_06_14(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateOutputBookingFields",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new OutputBookingFieldValidator_2024_06_14(),
    });
  };
}

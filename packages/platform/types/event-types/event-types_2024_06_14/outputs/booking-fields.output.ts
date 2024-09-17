import { BadRequestException } from "@nestjs/common";
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

class NameDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  isDefault = true;

  @IsString()
  slug!: "name";

  @IsString()
  type!: "name";

  @IsBoolean()
  required!: true;
}

class EmailDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  isDefault = true;

  @IsString()
  slug!: "email";

  @IsString()
  type!: "email";

  @IsBoolean()
  required!: true;
}

class LocationDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  isDefault = true;

  @IsString()
  slug!: "location";

  @IsString()
  type!: "radioInput";

  @IsBoolean()
  required!: false;
}

class RescheduleReasonDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  isDefault = true;

  @IsString()
  slug!: "rescheduleReason";

  @IsString()
  type!: "textarea";

  @IsBoolean()
  required!: false;
}

class TitleDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  isDefault = true;

  @IsString()
  slug!: "title";

  @IsString()
  type!: "text";

  @IsBoolean()
  required!: true;
}

class NotesDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  isDefault = true;

  @IsString()
  slug!: "notes";

  @IsString()
  type!: "textarea";

  @IsBoolean()
  required!: false;
}

class GuestsDefaultFieldOutput_2024_06_14 {
  @IsBoolean()
  isDefault = true;

  @IsString()
  slug!: "guests";

  @IsString()
  type!: "multiemail";

  @IsBoolean()
  required!: false;
}

class PhoneFieldOutput_2024_06_14 extends PhoneFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class AddressFieldOutput_2024_06_14 extends AddressFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class TextFieldOutput_2024_06_14 extends TextFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class NumberFieldOutput_2024_06_14 extends NumberFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class TextAreaFieldOutput_2024_06_14 extends TextAreaFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class SelectFieldOutput_2024_06_14 extends SelectFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class MultiSelectFieldOutput_2024_06_14 extends MultiSelectFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class MultiEmailFieldOutput_2024_06_14 extends MultiEmailFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class CheckboxGroupFieldOutput_2024_06_14 extends CheckboxGroupFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class RadioGroupFieldOutput_2024_06_14 extends RadioGroupFieldInput_2024_06_14 {
  @IsBoolean()
  isDefault = false;
}

class BooleanFieldOutput_2024_06_14 extends BooleanFieldInput_2024_06_14 {
  @IsBoolean()
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

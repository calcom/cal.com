import { BadRequestException } from "@nestjs/common";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { IsString, IsBoolean, IsArray, IsIn, IsOptional } from "class-validator";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { registerDecorator, validate, ValidatorConstraint } from "class-validator";

const inputBookingFieldTypes = [
  "phone",
  "address",
  "text",
  "number",
  "textarea",
  "select",
  "multiselect",
  "multiemail",
  "checkbox",
  "radio",
  "boolean",
] as const;

export class PhoneFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "phone";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty()
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsString()
  @IsOptional()
  @DocsProperty()
  placeholder?: string;
}

export class AddressFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "address";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Please enter your address" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsString()
  @IsOptional()
  @DocsProperty()
  @DocsProperty({ example: "e.g., 1234 Main St" })
  placeholder?: string;
}

export class TextFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "text";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Please enter your text" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsString()
  @DocsProperty({ example: "e.g., Enter text here" })
  @IsOptional()
  @DocsProperty()
  placeholder?: string;
}

export class NumberFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "number";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Please enter a number" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsString()
  @DocsProperty({ example: "e.g., 100" })
  @IsOptional()
  @DocsProperty()
  placeholder?: string;
}

export class TextAreaFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "textarea";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Please enter detailed information" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsString()
  @DocsProperty({ example: "e.g., Detailed description here..." })
  @IsOptional()
  @DocsProperty()
  placeholder?: string;
}

export class SelectFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "select";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Please select an option" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsString()
  @DocsProperty({ example: "Select..." })
  @IsOptional()
  @DocsProperty()
  placeholder?: string;

  @IsArray()
  @DocsProperty({ type: [String], example: ["Option 1", "Option 2"] })
  options!: string[];
}

export class MultiSelectFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "multiselect";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Please select multiple options" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsArray()
  @DocsProperty({ type: [String], example: ["Option 1", "Option 2"] })
  options!: string[];
}

export class MultiEmailFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "multiemail";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Please enter multiple emails" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsString()
  @DocsProperty({ example: "e.g., example@example.com" })
  @IsOptional()
  @DocsProperty()
  placeholder?: string;
}

export class CheckboxGroupFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "checkbox";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Select all that apply" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsArray()
  @DocsProperty({ type: [String], example: ["Checkbox 1", "Checkbox 2"] })
  options!: string[];
}

export class RadioGroupFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "radio";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Select one option" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;

  @IsArray()
  @DocsProperty({ type: [String], example: ["Radio 1", "Radio 2"] })
  options!: string[];
}

export class BooleanFieldInput_2024_06_14 {
  @IsIn(inputBookingFieldTypes)
  @DocsProperty()
  type!: "boolean";

  @IsString()
  @DocsProperty()
  slug!: string;

  @IsString()
  @DocsProperty({ example: "Agree to terms?" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;
}

export type InputBookingField_2024_06_14 =
  | PhoneFieldInput_2024_06_14
  | AddressFieldInput_2024_06_14
  | TextFieldInput_2024_06_14
  | NumberFieldInput_2024_06_14
  | TextAreaFieldInput_2024_06_14
  | SelectFieldInput_2024_06_14
  | MultiSelectFieldInput_2024_06_14
  | MultiEmailFieldInput_2024_06_14
  | CheckboxGroupFieldInput_2024_06_14
  | RadioGroupFieldInput_2024_06_14
  | BooleanFieldInput_2024_06_14;

@ValidatorConstraint({ async: true })
class InputBookingFieldValidator_2024_06_14 implements ValidatorConstraintInterface {
  private classTypeMap: { [key: string]: new () => InputBookingField_2024_06_14 } = {
    phone: PhoneFieldInput_2024_06_14,
    address: AddressFieldInput_2024_06_14,
    text: TextFieldInput_2024_06_14,
    number: NumberFieldInput_2024_06_14,
    textarea: TextAreaFieldInput_2024_06_14,
    select: SelectFieldInput_2024_06_14,
    multiselect: MultiSelectFieldInput_2024_06_14,
    multiemail: MultiEmailFieldInput_2024_06_14,
    checkbox: CheckboxGroupFieldInput_2024_06_14,
    radio: RadioGroupFieldInput_2024_06_14,
    boolean: BooleanFieldInput_2024_06_14,
  };

  private reservedSystemSlugs = ["name", "email", "location", "rescheduleReason"];

  async validate(bookingFields: { type: string; slug: string }[]) {
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

      if (this.reservedSystemSlugs.includes(slug)) {
        throw new BadRequestException(
          `The slug '${slug}' is reserved and cannot be used, because it is a slug of a default booking field. Reserved slugs are: ${this.reservedSystemSlugs.join(
            ", "
          )}`
        );
      }

      if (slugs.includes(slug)) {
        throw new BadRequestException(
          `Duplicate bookingFields slug '${slug}' found. All bookingFields slugs must be unique.`
        );
      }
      slugs.push(slug);

      const ClassType = this.classTypeMap[type];
      if (!ClassType) {
        throw new BadRequestException(`Unsupported booking field type '${type}'.`);
      }

      const instance = plainToInstance(ClassType, field);
      const errors = await validate(instance);
      if (errors.length > 0) {
        const message = errors.flatMap((error) => Object.values(error.constraints || {})).join(", ");
        throw new BadRequestException(`Validation failed for ${type} booking field: ${message}`);
      }
    }

    return true;
  }

  defaultMessage() {
    return `Validation failed for one or more booking fields.`;
  }
}

export function ValidateInputBookingFields_2024_06_14(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateInputBookingFields",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new InputBookingFieldValidator_2024_06_14(),
    });
  };
}

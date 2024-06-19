import { BadRequestException } from "@nestjs/common";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { IsString, IsBoolean, IsArray, IsIn, IsOptional } from "class-validator";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { registerDecorator, validate, ValidatorConstraint } from "class-validator";

const bookingFields = [
  "name",
  "email",
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

export class NameField_2024_06_14 {
  @IsIn(bookingFields)
  @DocsProperty()
  type!: "name";

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
export class EmailField_2024_06_14 {
  @IsIn(bookingFields)
  @DocsProperty()
  type!: "email";

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

export class PhoneField_2024_06_14 {
  @IsIn(bookingFields)
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

export class AddressField_2024_06_14 {
  @IsIn(bookingFields)
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

export class TextField_2024_06_14 {
  @IsIn(bookingFields)
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

export class NumberField_2024_06_14 {
  @IsIn(bookingFields)
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

export class TextAreaField_2024_06_14 {
  @IsIn(bookingFields)
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

export class SelectField_2024_06_14 {
  @IsIn(bookingFields)
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

export class MultiSelectField_2024_06_14 {
  @IsIn(bookingFields)
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

export class MultiEmailField_2024_06_14 {
  @IsIn(bookingFields)
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

export class CheckboxGroupField_2024_06_14 {
  @IsIn(bookingFields)
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

export class RadioGroupField_2024_06_14 {
  @IsIn(bookingFields)
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

export class BooleanField_2024_06_14 {
  @IsIn(bookingFields)
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

export type BookingField_2024_06_14 =
  | NameField_2024_06_14
  | EmailField_2024_06_14
  | PhoneField_2024_06_14
  | AddressField_2024_06_14
  | TextField_2024_06_14
  | NumberField_2024_06_14
  | TextAreaField_2024_06_14
  | SelectField_2024_06_14
  | MultiSelectField_2024_06_14
  | MultiEmailField_2024_06_14
  | CheckboxGroupField_2024_06_14
  | RadioGroupField_2024_06_14
  | BooleanField_2024_06_14;

@ValidatorConstraint({ async: true })
class BookingFieldValidator_2024_06_14 implements ValidatorConstraintInterface {
  private classTypeMap: { [key: string]: new () => BookingField_2024_06_14 } = {
    name: NameField_2024_06_14,
    email: EmailField_2024_06_14,
    phone: PhoneField_2024_06_14,
    address: AddressField_2024_06_14,
    text: TextField_2024_06_14,
    number: NumberField_2024_06_14,
    textarea: TextAreaField_2024_06_14,
    select: SelectField_2024_06_14,
    multiselect: MultiSelectField_2024_06_14,
    multiemail: MultiEmailField_2024_06_14,
    checkbox: CheckboxGroupField_2024_06_14,
    radio: RadioGroupField_2024_06_14,
    boolean: BooleanField_2024_06_14,
  };

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

export function ValidateBookingFields_2024_06_14(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateBookingFields",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new BookingFieldValidator_2024_06_14(),
    });
  };
}

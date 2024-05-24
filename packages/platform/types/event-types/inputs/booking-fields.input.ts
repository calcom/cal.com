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

export class NameField {
  @IsIn(bookingFields)
  type!: "name";

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
export class EmailField {
  @IsIn(bookingFields)
  type!: "email";

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

export class PhoneField {
  @IsIn(bookingFields)
  type!: "phone";

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

export class AddressField {
  @IsIn(bookingFields)
  type!: "address";

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

export class TextField {
  @IsIn(bookingFields)
  type!: "text";

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

export class NumberField {
  @IsIn(bookingFields)
  type!: "number";

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

export class TextAreaField {
  @IsIn(bookingFields)
  type!: "textarea";

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

export class SelectField {
  @IsIn(bookingFields)
  type!: "select";

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

export class MultiSelectField {
  @IsIn(bookingFields)
  type!: "multiselect";

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

export class MultiEmailField {
  @IsIn(bookingFields)
  type!: "multiemail";

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

export class CheckboxGroupField {
  @IsIn(bookingFields)
  type!: "checkbox";

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

export class RadioGroupField {
  @IsIn(bookingFields)
  type!: "radio";

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

export class BooleanField {
  @IsIn(bookingFields)
  type!: "boolean";

  @IsString()
  @DocsProperty({ example: "Agree to terms?" })
  label!: string;

  @IsBoolean()
  @DocsProperty()
  required!: boolean;
}

export type BookingField =
  | NameField
  | EmailField
  | PhoneField
  | AddressField
  | TextField
  | NumberField
  | TextAreaField
  | SelectField
  | MultiSelectField
  | MultiEmailField
  | CheckboxGroupField
  | RadioGroupField
  | BooleanField;

@ValidatorConstraint({ async: true })
class BookingFieldValidator implements ValidatorConstraintInterface {
  private classTypeMap: { [key: string]: new () => BookingField } = {
    name: NameField,
    email: EmailField,
    phone: PhoneField,
    address: AddressField,
    text: TextField,
    number: NumberField,
    textarea: TextAreaField,
    select: SelectField,
    multiselect: MultiSelectField,
    multiemail: MultiEmailField,
    checkbox: CheckboxGroupField,
    radio: RadioGroupField,
    boolean: BooleanField,
  };

  async validate(bookingFields: { type: string }[]) {
    if (!Array.isArray(bookingFields)) {
      throw new BadRequestException(`'bookingFields' must be an array.`);
    }

    if (!bookingFields.length) {
      throw new BadRequestException(`'bookingFields' must contain at least 1 booking field.`);
    }

    for (const field of bookingFields) {
      const { type } = field;
      if (!type) {
        throw new BadRequestException(`Each booking field must have a 'type' property.`);
      }

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

export function ValidateBookingFields(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateBookingFields",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new BookingFieldValidator(),
    });
  };
}

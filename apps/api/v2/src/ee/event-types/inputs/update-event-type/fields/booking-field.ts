import { Type } from "class-transformer";
import { IsOptional, ValidateNested, IsBoolean, IsString, IsArray } from "class-validator";

type FieldType =
  | "number"
  | "boolean"
  | "address"
  | "name"
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "multiemail"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "radioInput";

class Option {
  @IsString()
  value!: string;

  @IsString()
  label!: string;
}

class Source {
  @IsString()
  id!: string;

  @IsString()
  type!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  editUrl?: string;

  @IsOptional()
  @IsBoolean()
  fieldRequired?: boolean;
}

class View {
  @IsString()
  id!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class OptionsInput {
  @IsString()
  type!: "address" | "text" | "phone";

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  placeholder?: string;
}

class VariantField {
  @IsString()
  type!: FieldType;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  labelAsSafeHtml?: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

class Variant {
  @ValidateNested({ each: true })
  @Type(() => VariantField)
  fields!: VariantField[];
}

class VariantsConfig {
  variants!: Record<string, Variant>;
}

export class BookingField {
  @IsString()
  type!: FieldType;

  @IsString()
  name!: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Option)
  options?: Option[];

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  labelAsSafeHtml?: string;

  @IsOptional()
  @IsString()
  defaultLabel?: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  getOptionsAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionsInput)
  optionsInputs?: Record<string, OptionsInput>;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VariantsConfig)
  variantsConfig?: VariantsConfig;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => View)
  views?: View[];

  @IsOptional()
  @IsBoolean()
  hideWhenJustOneOption?: boolean;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsString()
  editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly";

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Source)
  sources?: Source[];
}

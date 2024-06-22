import { zodResolver } from "@hookform/resolvers/zod";
import { useImperativeHandle } from "react";
import React from "react";
import type { DeepPartial, SubmitHandler, FieldValues } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { z, ZodRawShape } from "zod";

import { Form } from "@calcom/ui";

import type { FormField } from "./FormFieldRenderer";
import { FormFieldRenderer } from "./FormFieldRenderer";

export interface FormRendererHandles<FormValues> {
  reset: (values: FormValues) => void;
  getValues: () => FormValues;
}

export interface FormRendererProps<SelectOption, FormValues extends FieldValues> {
  fields: FormField<SelectOption>[];
  FormZodSchema: z.ZodObject<ZodRawShape>;
  onSubmit: SubmitHandler<FormValues>;
  defaultValues?: DeepPartial<FormValues>;
  isLoading?: boolean;
  showInternalButton?: boolean;
}

export const FormRenderer = <SelectOption, FormValues extends FieldValues>(
  props: FormRendererProps<SelectOption, FormValues>,
  ref: React.ForwardedRef<FormRendererHandles<FormValues>>
) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(props.FormZodSchema),
    defaultValues: props.defaultValues,
  });
  useImperativeHandle(ref, () => ({
    reset(values: FormValues) {
      form.reset(values);
    },
    getValues() {
      return form.getValues();
    },
  }));

  return (
    <Form
      form={form}
      handleSubmit={() => form.handleSubmit(props.onSubmit)()}
      className="flex w-[100%] flex-col justify-between space-y-4">
      {props.fields.map((element, index, { length }) => (
        <FormFieldRenderer<SelectOption>
          key={index}
          element={element}
          form={form}
          isLast={length - 1 === index}
          isLoading={props.isLoading}
          showInternalButton={props.showInternalButton}
        />
      ))}
    </Form>
  );
};
FormRenderer.displayName = "FormRenderer";

function fixedForwardRef<T, FormRendererProps>(
  render: (props: FormRendererProps, ref: React.Ref<T>) => React.ReactElement
): (props: FormRendererProps & React.RefAttributes<T>) => React.ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return React.forwardRef(render) as any;
}
export const ForwardedFormRenderer = fixedForwardRef(FormRenderer);

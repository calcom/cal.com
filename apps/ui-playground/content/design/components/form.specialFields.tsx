"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useForm } from "react-hook-form";

import { Button } from "@calcom/ui/components/button";
import { InputField } from "@calcom/ui/components/form";

type FormValues = {
  age?: number;
  phone?: string;
};

export const SpecialFieldsExample: React.FC = () => {
  const form = useForm<FormValues>({
    defaultValues: {
      age: undefined,
      phone: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log("Form submitted:", data);
  };

  return (
    <RenderComponentWithSnippet>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <InputField
          label="Age"
          type="number"
          {...form.register("age", { valueAsNumber: true })}
          error={form.formState.errors.age?.message}
        />
        <InputField
          label="Phone"
          type="tel"
          addOnLeading="+"
          {...form.register("phone")}
          error={form.formState.errors.phone?.message}
        />
        <div className="flex justify-end space-x-2">
          <Button color="minimal" type="button" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            Submit
          </Button>
        </div>
      </form>
    </RenderComponentWithSnippet>
  );
};

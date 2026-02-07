import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { vi } from "vitest";

import { FormBuilderField } from "./FormBuilderField";

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

const renderComponent = ({
  props: props,
  formDefaultValues,
}: {
  props: Parameters<typeof FormBuilderField>[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formDefaultValues?: any;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let formMethods: UseFormReturn<any> | undefined;
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const form = useForm({
      defaultValues: formDefaultValues,
    });
    formMethods = form;
    return <FormProvider {...form}>{children}</FormProvider>;
  };
  render(<FormBuilderField {...props} />, { wrapper: Wrapper });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { formMethods: formMethods! };
};

describe("FormBuilderField", () => {
  it("verify a text type input field", () => {
    const { formMethods } = renderComponent({
      props: {
        field: {
          name: "textInput1",
          type: "text",
          label: "Text Input 1",
          placeholder: "Enter text",
        },
        readOnly: false,
        className: "",
      },
      formDefaultValues: {},
    });
    expect(component.getFieldInput({ label: "Text Input 1" }).value).toEqual("");
    component.fillFieldInput({ label: "Text Input 1", value: "test" });
    expectScenario.toHaveFieldValue({
      label: "Text Input 1",
      identifier: "textInput1",
      value: "test",
      formMethods,
    });
  });
});

const component = {
  getFieldInput: ({ label }) => screen.getByRole("textbox", { name: label }) as HTMLInputElement,
  fillFieldInput: ({ label, value }: { label: string; value: string }) => {
    fireEvent.change(component.getFieldInput({ label }), { target: { value } });
  },
};

const expectScenario = {
  toHaveFieldValue: ({
    identifier,
    label,
    value,
    formMethods,
  }: {
    identifier: string;
    label: string;
    value: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formMethods: UseFormReturn<any>;
  }) => {
    expect(component.getFieldInput({ label }).value).toEqual(value);
    expect(formMethods.getValues(`responses.${identifier}`)).toEqual(value);
  },
};

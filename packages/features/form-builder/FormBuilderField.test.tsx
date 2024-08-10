import { render } from "@testing-library/react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { vi } from "vitest";

import { FormBuilderField } from "./FormBuilderField";
import { getLocationBookingField } from "./testUtils";

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

const renderComponent = ({
  props: props,
  formDefaultValues,
}: {
  props: Parameters<typeof FormBuilderField>[0];
  formDefaultValues?: any;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const form = useForm({
      defaultValues: formDefaultValues,
    });
    return <FormProvider {...form}>{children}</FormProvider>;
  };
  return render(<FormBuilderField {...props} />, { wrapper: Wrapper });
};

describe("FormBuilderField", () => {
  it("basic test", () => {
    renderComponent({
      props: {
        field: getLocationBookingField(),
        readOnly: false,
        className: "",
      },
      formDefaultValues: {},
    });
  });
});

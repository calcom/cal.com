import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { getBookingFieldsWithSystemFields } from "../../../lib/getBookingFields";
import { BookingFields } from "./BookingFields";

const renderComponent = ({
  props: props,
  formDefaultValues,
}: {
  props: Parameters<typeof BookingFields>[0];
  formDefaultValues?: any;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const form = useForm({
      defaultValues: formDefaultValues,
    });
    return (
      <TooltipProvider>
        <FormProvider {...form}>{children}</FormProvider>
      </TooltipProvider>
    );
  };
  return render(<BookingFields {...props} />, { wrapper: Wrapper });
};

describe("FormBuilderField", () => {
  it("basic test", () => {
    renderComponent({
      props: {
        fields: getBookingFieldsWithSystemFields({
          disableGuests: false,
          bookingFields: [],
          metadata: null,
          workflows: [],
          customInputs: [],
        }),
        locations: [
          {
            type: "phone",
          },
          {
            link: "https://google.com",
            type: "link",
            displayLocationPublicly: true,
          },
        ],
        isDynamicGroupBooking: false,
        bookingData: null,
      },
      formDefaultValues: {},
    });
    screen.getByText("email_address");
    screen.logTestingPlaygroundURL();
  });
});

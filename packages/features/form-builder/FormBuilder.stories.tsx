import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useForm, FormProvider } from "react-hook-form";

import { FormBuilder } from "./FormBuilder";

// Wrapper component to provide form context
function FormBuilderWrapper(props: React.ComponentProps<typeof FormBuilder>) {
  const methods = useForm({
    defaultValues: {
      fields: [
        {
          name: "name",
          type: "name" as const,
          label: "Your Name",
          required: true,
          editable: "system" as const,
          defaultLabel: "your_name",
          variant: "fullName",
          variantsConfig: {
            variants: {
              fullName: {
                fields: [
                  {
                    name: "fullName",
                    type: "text" as const,
                    label: "your_name",
                    required: true,
                  },
                ],
              },
            },
          },
        },
        {
          name: "email",
          type: "email" as const,
          label: "Email Address",
          required: true,
          editable: "system" as const,
          defaultLabel: "email_address",
        },
        {
          name: "location",
          type: "radioInput" as const,
          label: "Location",
          required: false,
          editable: "system-but-optional" as const,
          defaultLabel: "location",
        },
      ],
    },
  });

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl">
        <FormBuilder {...props} />
      </div>
    </FormProvider>
  );
}

const meta = {
  component: FormBuilder,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      description: "Title for the form builder section",
      control: "text",
    },
    description: {
      description: "Description text for the form builder",
      control: "text",
    },
    addFieldLabel: {
      description: "Label for the add field button",
      control: "text",
    },
    disabled: {
      description: "Whether the form builder is disabled",
      control: "boolean",
    },
    showPhoneAndEmailToggle: {
      description: "Show toggle between phone and email fields",
      control: "boolean",
    },
    showPriceField: {
      description: "Show price field for applicable field types",
      control: "boolean",
    },
    paymentCurrency: {
      description: "Currency for pricing fields",
      control: "text",
    },
  },
  render: (args) => <FormBuilderWrapper {...args} />,
} satisfies Meta<typeof FormBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Booking Questions",
    description: "Customize the information you collect from people booking with you",
    addFieldLabel: "Add question",
    formProp: "fields",
    disabled: false,
    LockedIcon: false,
    dataStore: {
      options: {},
    },
    paymentCurrency: "USD",
  },
};

export const Disabled: Story = {
  args: {
    title: "Booking Questions (View Only)",
    description: "You don't have permission to edit these questions",
    addFieldLabel: "Add question",
    formProp: "fields",
    disabled: true,
    LockedIcon: false,
    dataStore: {
      options: {},
    },
    paymentCurrency: "USD",
  },
};

export const WithPhoneEmailToggle: Story = {
  args: {
    title: "Booking Questions",
    description: "Customize the information you collect from people booking with you",
    addFieldLabel: "Add question",
    formProp: "fields",
    disabled: false,
    LockedIcon: false,
    dataStore: {
      options: {},
    },
    showPhoneAndEmailToggle: true,
    paymentCurrency: "USD",
  },
};

export const WithPricing: Story = {
  args: {
    title: "Booking Questions with Pricing",
    description: "Collect payment information with custom questions",
    addFieldLabel: "Add paid question",
    formProp: "fields",
    disabled: false,
    LockedIcon: false,
    dataStore: {
      options: {},
    },
    showPriceField: true,
    paymentCurrency: "USD",
  },
};

export const WithEuroCurrency: Story = {
  args: {
    title: "Booking Questions (EUR)",
    description: "Pricing in Euros",
    addFieldLabel: "Add question",
    formProp: "fields",
    disabled: false,
    LockedIcon: false,
    dataStore: {
      options: {},
    },
    showPriceField: true,
    paymentCurrency: "EUR",
  },
};

// Story with custom fields using a wrapper that provides different default values
function CustomFieldsWrapper(props: React.ComponentProps<typeof FormBuilder>) {
  const methods = useForm({
    defaultValues: {
      fields: [
        {
          name: "name",
          type: "name" as const,
          label: "Your Name",
          required: true,
          editable: "system" as const,
          defaultLabel: "your_name",
          variant: "fullName",
          variantsConfig: {
            variants: {
              fullName: {
                fields: [
                  {
                    name: "fullName",
                    type: "text" as const,
                    label: "your_name",
                    required: true,
                  },
                ],
              },
            },
          },
        },
        {
          name: "email",
          type: "email" as const,
          label: "Email Address",
          required: true,
          editable: "system" as const,
          defaultLabel: "email_address",
        },
        {
          name: "company",
          type: "text" as const,
          label: "Company Name",
          required: false,
          editable: "user" as const,
          sources: [
            {
              label: "User",
              type: "user" as const,
              id: "user",
              fieldRequired: false,
            },
          ],
        },
        {
          name: "guests",
          type: "multiemail" as const,
          label: "Additional Guests",
          required: false,
          hidden: true,
          editable: "system-but-optional" as const,
          defaultLabel: "additional_guests",
        },
        {
          name: "meetingPurpose",
          type: "select" as const,
          label: "Meeting Purpose",
          required: true,
          editable: "user" as const,
          options: [
            { label: "Sales Demo", value: "sales" },
            { label: "Technical Support", value: "support" },
            { label: "General Inquiry", value: "inquiry" },
          ],
          sources: [
            {
              label: "User",
              type: "user" as const,
              id: "user",
              fieldRequired: true,
            },
          ],
        },
        {
          name: "specialRequirements",
          type: "textarea" as const,
          label: "Special Requirements",
          placeholder: "Any special requests or requirements...",
          required: false,
          editable: "user" as const,
          sources: [
            {
              label: "User",
              type: "user" as const,
              id: "user",
              fieldRequired: false,
            },
          ],
        },
      ],
    },
  });

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl">
        <FormBuilder {...props} />
      </div>
    </FormProvider>
  );
}

export const WithMixedFieldTypes: Story = {
  render: (args) => <CustomFieldsWrapper {...args} />,
  args: {
    title: "Event Registration Form",
    description: "Gather comprehensive information from attendees",
    addFieldLabel: "Add custom field",
    formProp: "fields",
    disabled: false,
    LockedIcon: false,
    dataStore: {
      options: {},
    },
    paymentCurrency: "USD",
  },
};

// Story demonstrating the locked state with icon
function LockedFormWrapper(props: React.ComponentProps<typeof FormBuilder>) {
  const methods = useForm({
    defaultValues: {
      fields: [
        {
          name: "name",
          type: "name" as const,
          label: "Your Name",
          required: true,
          editable: "system" as const,
          defaultLabel: "your_name",
          variant: "fullName",
          variantsConfig: {
            variants: {
              fullName: {
                fields: [
                  {
                    name: "fullName",
                    type: "text" as const,
                    label: "your_name",
                    required: true,
                  },
                ],
              },
            },
          },
        },
        {
          name: "email",
          type: "email" as const,
          label: "Email Address",
          required: true,
          editable: "system" as const,
          defaultLabel: "email_address",
        },
      ],
    },
  });

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl">
        <FormBuilder {...props} />
      </div>
    </FormProvider>
  );
}

export const WithLockedIcon: Story = {
  render: (args) => <LockedFormWrapper {...args} />,
  args: {
    title: "Booking Questions",
    description: "Premium feature - upgrade to customize",
    addFieldLabel: "Add question",
    formProp: "fields",
    disabled: false,
    LockedIcon: (
      <span className="ml-2 inline-block">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </span>
    ),
    dataStore: {
      options: {},
    },
    paymentCurrency: "USD",
  },
};

// Empty state story
function EmptyFormWrapper(props: React.ComponentProps<typeof FormBuilder>) {
  const methods = useForm({
    defaultValues: {
      fields: [],
    },
  });

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl">
        <FormBuilder {...props} />
      </div>
    </FormProvider>
  );
}

export const EmptyState: Story = {
  render: (args) => <EmptyFormWrapper {...args} />,
  args: {
    title: "Booking Questions",
    description: "Start building your custom booking form",
    addFieldLabel: "Add your first question",
    formProp: "fields",
    disabled: false,
    LockedIcon: false,
    dataStore: {
      options: {},
    },
    paymentCurrency: "USD",
  },
};

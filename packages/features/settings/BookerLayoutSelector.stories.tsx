import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormProvider, useForm } from "react-hook-form";

import { BookerLayouts } from "@calcom/prisma/zod-utils";
import type { BookerLayoutSettings } from "@calcom/prisma/zod-utils";

import { BookerLayoutSelector } from "./BookerLayoutSelector";

// Wrapper component to provide form context
const FormWrapper = ({
  children,
  defaultValues,
}: {
  children: React.ReactNode;
  defaultValues?: any;
}) => {
  const methods = useForm({
    defaultValues: {
      metadata: {
        bookerLayouts: defaultValues?.bookerLayouts || {
          enabledLayouts: [BookerLayouts.MONTH_VIEW, BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
          defaultLayout: BookerLayouts.MONTH_VIEW,
        },
      },
      ...defaultValues,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

const meta = {
  component: BookerLayoutSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookerLayoutSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FormWrapper>
      <BookerLayoutSelector />
    </FormWrapper>
  ),
};

export const WithCustomTitle: Story = {
  render: () => (
    <FormWrapper>
      <BookerLayoutSelector title="Choose Your Layout" description="Select which booking layouts to enable" />
    </FormWrapper>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <FormWrapper>
      <BookerLayoutSelector isDark={true} />
    </FormWrapper>
  ),
};

export const WithOuterBorder: Story = {
  render: () => (
    <FormWrapper>
      <BookerLayoutSelector isOuterBorder={true} />
    </FormWrapper>
  ),
};

export const Loading: Story = {
  render: () => (
    <FormWrapper>
      <BookerLayoutSelector isLoading={true} />
    </FormWrapper>
  ),
};

export const Disabled: Story = {
  render: () => (
    <FormWrapper>
      <BookerLayoutSelector isDisabled={true} />
    </FormWrapper>
  ),
};

export const MonthViewOnly: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        metadata: {
          bookerLayouts: {
            enabledLayouts: [BookerLayouts.MONTH_VIEW],
            defaultLayout: BookerLayouts.MONTH_VIEW,
          },
        },
      }}>
      <BookerLayoutSelector />
    </FormWrapper>
  ),
};

export const WeekViewDefault: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        metadata: {
          bookerLayouts: {
            enabledLayouts: [BookerLayouts.MONTH_VIEW, BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
            defaultLayout: BookerLayouts.WEEK_VIEW,
          },
        },
      }}>
      <BookerLayoutSelector />
    </FormWrapper>
  ),
};

export const ColumnViewDefault: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        metadata: {
          bookerLayouts: {
            enabledLayouts: [BookerLayouts.MONTH_VIEW, BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
            defaultLayout: BookerLayouts.COLUMN_VIEW,
          },
        },
      }}>
      <BookerLayoutSelector />
    </FormWrapper>
  ),
};

export const TwoLayoutsEnabled: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        metadata: {
          bookerLayouts: {
            enabledLayouts: [BookerLayouts.MONTH_VIEW, BookerLayouts.WEEK_VIEW],
            defaultLayout: BookerLayouts.MONTH_VIEW,
          },
        },
      }}>
      <BookerLayoutSelector />
    </FormWrapper>
  ),
};

export const WithUserFallback: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        metadata: {
          bookerLayouts: null,
        },
      }}>
      <BookerLayoutSelector
        fallbackToUserSettings={true}
        user={{
          defaultBookerLayouts: {
            enabledLayouts: [BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
            defaultLayout: BookerLayouts.WEEK_VIEW,
          },
        }}
      />
    </FormWrapper>
  ),
};

export const WithUserFallbackLoading: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        metadata: {
          bookerLayouts: null,
        },
      }}>
      <BookerLayoutSelector
        fallbackToUserSettings={true}
        isUserLoading={true}
        user={{
          defaultBookerLayouts: {
            enabledLayouts: [BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
            defaultLayout: BookerLayouts.WEEK_VIEW,
          },
        }}
      />
    </FormWrapper>
  ),
};

export const DarkModeWithOuterBorder: Story = {
  render: () => (
    <FormWrapper>
      <BookerLayoutSelector isDark={true} isOuterBorder={true} />
    </FormWrapper>
  ),
};

export const CustomFieldName: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        customBookerLayouts: {
          enabledLayouts: [BookerLayouts.COLUMN_VIEW],
          defaultLayout: BookerLayouts.COLUMN_VIEW,
        },
      }}>
      <BookerLayoutSelector name="customBookerLayouts" />
    </FormWrapper>
  ),
};

export const Interactive: Story = {
  render: () => {
    const FormContent = () => {
      const methods = useForm({
        defaultValues: {
          metadata: {
            bookerLayouts: {
              enabledLayouts: [BookerLayouts.MONTH_VIEW, BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
              defaultLayout: BookerLayouts.MONTH_VIEW,
            } as BookerLayoutSettings,
          },
        },
      });

      const bookerLayouts = methods.watch("metadata.bookerLayouts");

      return (
        <FormProvider {...methods}>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold">Current State:</h3>
              <div className="space-y-1 text-xs">
                <p>
                  Enabled layouts:{" "}
                  {bookerLayouts?.enabledLayouts?.join(", ") || "None"}
                </p>
                <p>Default layout: {bookerLayouts?.defaultLayout || "None"}</p>
              </div>
            </div>
            <BookerLayoutSelector />
          </div>
        </FormProvider>
      );
    };

    return <FormContent />;
  },
};

export const InteractiveDarkMode: Story = {
  render: () => {
    const FormContent = () => {
      const methods = useForm({
        defaultValues: {
          metadata: {
            bookerLayouts: {
              enabledLayouts: [BookerLayouts.MONTH_VIEW, BookerLayouts.WEEK_VIEW, BookerLayouts.COLUMN_VIEW],
              defaultLayout: BookerLayouts.MONTH_VIEW,
            } as BookerLayoutSettings,
          },
        },
      });

      const bookerLayouts = methods.watch("metadata.bookerLayouts");

      return (
        <FormProvider {...methods}>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold">Current State:</h3>
              <div className="space-y-1 text-xs">
                <p>
                  Enabled layouts:{" "}
                  {bookerLayouts?.enabledLayouts?.join(", ") || "None"}
                </p>
                <p>Default layout: {bookerLayouts?.defaultLayout || "None"}</p>
              </div>
            </div>
            <BookerLayoutSelector isDark={true} />
          </div>
        </FormProvider>
      );
    };

    return <FormContent />;
  },
};

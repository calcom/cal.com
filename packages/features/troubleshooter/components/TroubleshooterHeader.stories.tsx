import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import dayjs from "@calcom/dayjs";

import { TroubleshooterHeader } from "./TroubleshooterHeader";

// Mock the useLocale hook
const mockUseLocale = () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      today: "Today",
    };
    return translations[key] || key;
  },
  i18n: {
    language: "en",
  },
});

// Mock the store with default values
const createMockStore = (selectedDate: string) => (selector: any) => {
  const state = {
    selectedDate,
    setSelectedDate: fn((date: string) => console.log("setSelectedDate", date)),
    addToSelectedDate: fn((days: number) => console.log("addToSelectedDate", days)),
  };
  return selector(state);
};

// Mock modules
jest.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: mockUseLocale,
}));

jest.mock("../store", () => ({
  useTroubleshooterStore: createMockStore(dayjs().format("YYYY-MM-DD")),
}));

const meta = {
  component: TroubleshooterHeader,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    extraDays: {
      control: "number",
      description: "Number of days to show in the date range",
    },
    isMobile: {
      control: "boolean",
      description: "Whether the component is displayed on mobile (returns null when true)",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TroubleshooterHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    extraDays: 7,
    isMobile: false,
  },
};

export const SingleDay: Story = {
  args: {
    extraDays: 1,
    isMobile: false,
  },
};

export const ThreeDays: Story = {
  args: {
    extraDays: 3,
    isMobile: false,
  },
};

export const TwoWeeks: Story = {
  args: {
    extraDays: 14,
    isMobile: false,
  },
};

export const Month: Story = {
  args: {
    extraDays: 30,
    isMobile: false,
  },
};

export const Mobile: Story = {
  args: {
    extraDays: 7,
    isMobile: true,
  },
  parameters: {
    docs: {
      description: {
        story: "On mobile, the component returns null and doesn't render anything.",
      },
    },
  },
};

export const CrossMonthRange: Story = {
  args: {
    extraDays: 14,
    isMobile: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "When the date range spans across different months, both month names are displayed.",
      },
    },
  },
  render: (args) => {
    // Temporarily override the mock for this story
    const originalMock = require("../store").useTroubleshooterStore;
    const endOfMonthDate = dayjs().endOf("month").subtract(5, "days").format("YYYY-MM-DD");

    jest.mock("../store", () => ({
      useTroubleshooterStore: createMockStore(endOfMonthDate),
    }));

    return <TroubleshooterHeader {...args} />;
  },
};

export const WithTodayButton: Story = {
  args: {
    extraDays: 7,
    isMobile: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "When the selected date is more than 3 days away from today, a 'Today' button appears to quickly jump back to the current date.",
      },
    },
  },
  render: (args) => {
    // Temporarily override the mock for this story
    const pastDate = dayjs().subtract(10, "days").format("YYYY-MM-DD");

    jest.mock("../store", () => ({
      useTroubleshooterStore: createMockStore(pastDate),
    }));

    return <TroubleshooterHeader {...args} />;
  },
};

export const InteractiveNavigation: Story = {
  args: {
    extraDays: 7,
    isMobile: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Use the chevron buttons to navigate between date ranges. The navigation buttons will add or subtract the number of extraDays.",
      },
    },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8 p-8">
      <div>
        <h3 className="text-sm font-semibold mb-4">Default - 7 Days</h3>
        <div className="border rounded-lg overflow-hidden">
          <TroubleshooterHeader extraDays={7} isMobile={false} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Single Day</h3>
        <div className="border rounded-lg overflow-hidden">
          <TroubleshooterHeader extraDays={1} isMobile={false} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Two Weeks</h3>
        <div className="border rounded-lg overflow-hidden">
          <TroubleshooterHeader extraDays={14} isMobile={false} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Month</h3>
        <div className="border rounded-lg overflow-hidden">
          <TroubleshooterHeader extraDays={30} isMobile={false} />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "fullscreen",
  },
  decorators: [],
};

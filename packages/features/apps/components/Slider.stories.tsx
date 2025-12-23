import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Slider } from "./Slider";

const meta = {
  component: Slider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      description: "Title displayed above the slider",
      control: "text",
    },
    className: {
      description: "Additional CSS classes for the slider container",
      control: "text",
    },
    items: {
      description: "Array of items to display in the slider",
      control: "object",
    },
    options: {
      description: "Glide.js options for carousel configuration",
      control: "object",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample card component for demo purposes
const SampleCard = ({ title, description }: { title: string; description: string }) => (
  <div className="bg-default border-subtle hover:border-emphasis rounded-md border p-4 transition-colors">
    <h3 className="text-emphasis mb-2 text-lg font-semibold">{title}</h3>
    <p className="text-subtle text-sm">{description}</p>
  </div>
);

// Sample data for stories
const sampleApps = [
  { id: "1", name: "Google Calendar", description: "Sync with Google Calendar to manage your schedule" },
  { id: "2", name: "Zoom", description: "Automatically create Zoom meeting links for your bookings" },
  { id: "3", name: "Stripe", description: "Accept payments for your services" },
  { id: "4", name: "Slack", description: "Get notified in Slack when bookings are made" },
  { id: "5", name: "HubSpot", description: "Sync your contacts and deals with HubSpot CRM" },
  { id: "6", name: "Salesforce", description: "Connect with Salesforce to manage leads" },
];

export const Default: Story = {
  args: {
    title: "Popular Apps",
    items: sampleApps,
    itemKey: (item) => item.id,
    renderItem: (item) => <SampleCard title={item.name} description={item.description} />,
    options: {
      perView: 3,
      gap: 16,
    },
  },
};

export const WithoutTitle: Story = {
  args: {
    items: sampleApps.slice(0, 4),
    itemKey: (item) => item.id,
    renderItem: (item) => <SampleCard title={item.name} description={item.description} />,
    options: {
      perView: 3,
      gap: 16,
    },
  },
};

export const SingleItemPerView: Story = {
  args: {
    title: "Featured Integrations",
    items: sampleApps,
    itemKey: (item) => item.id,
    renderItem: (item) => <SampleCard title={item.name} description={item.description} />,
    options: {
      perView: 1,
      gap: 20,
    },
  },
};

export const TwoItemsPerView: Story = {
  args: {
    title: "App Showcase",
    items: sampleApps,
    itemKey: (item) => item.id,
    renderItem: (item) => <SampleCard title={item.name} description={item.description} />,
    options: {
      perView: 2,
      gap: 16,
    },
  },
};

export const FourItemsPerView: Story = {
  args: {
    title: "All Apps",
    items: sampleApps,
    itemKey: (item) => item.id,
    renderItem: (item) => <SampleCard title={item.name} description={item.description} />,
    options: {
      perView: 4,
      gap: 12,
    },
  },
};

export const SmallGap: Story = {
  args: {
    title: "Compact View",
    items: sampleApps,
    itemKey: (item) => item.id,
    renderItem: (item) => <SampleCard title={item.name} description={item.description} />,
    options: {
      perView: 3,
      gap: 8,
    },
  },
};

export const LargeGap: Story = {
  args: {
    title: "Spacious View",
    items: sampleApps,
    itemKey: (item) => item.id,
    renderItem: (item) => <SampleCard title={item.name} description={item.description} />,
    options: {
      perView: 3,
      gap: 32,
    },
  },
};

export const WithAutoplay: Story = {
  args: {
    title: "Auto-rotating Apps",
    items: sampleApps,
    itemKey: (item) => item.id,
    renderItem: (item) => <SampleCard title={item.name} description={item.description} />,
    options: {
      perView: 3,
      gap: 16,
      autoplay: 3000,
      hoverpause: true,
    },
  },
};

export const FewItems: Story = {
  args: {
    title: "Limited Apps",
    items: sampleApps.slice(0, 2),
    itemKey: (item) => item.id,
    renderItem: (item) => <SampleCard title={item.name} description={item.description} />,
    options: {
      perView: 3,
      gap: 16,
    },
  },
};

export const StringItems: Story = {
  args: {
    title: "Simple Text Slider",
    items: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
    itemKey: (item: string) => item,
    renderItem: (item: string) => (
      <div className="bg-subtle rounded-md p-6 text-center">
        <p className="text-emphasis text-lg font-medium">{item}</p>
      </div>
    ),
    options: {
      perView: 3,
      gap: 16,
    },
  },
};

export const CustomStyling: Story = {
  args: {
    title: "Custom Styled Cards",
    className: "custom-slider",
    items: sampleApps.slice(0, 4),
    itemKey: (item) => item.id,
    renderItem: (item) => (
      <div className="bg-brand-default text-brand-emphasis rounded-lg p-6 shadow-lg">
        <h3 className="mb-2 text-xl font-bold">{item.name}</h3>
        <p className="text-brand-emphasis text-sm opacity-90">{item.description}</p>
      </div>
    ),
    options: {
      perView: 2,
      gap: 24,
    },
  },
};

export const ImageCards: Story = {
  args: {
    title: "App Gallery",
    items: [
      { id: "1", name: "Google Calendar", image: "https://via.placeholder.com/200x120/4285F4/FFF?text=Google" },
      { id: "2", name: "Zoom", image: "https://via.placeholder.com/200x120/2D8CFF/FFF?text=Zoom" },
      { id: "3", name: "Stripe", image: "https://via.placeholder.com/200x120/635BFF/FFF?text=Stripe" },
      { id: "4", name: "Slack", image: "https://via.placeholder.com/200x120/4A154B/FFF?text=Slack" },
      { id: "5", name: "HubSpot", image: "https://via.placeholder.com/200x120/FF7A59/FFF?text=HubSpot" },
    ],
    itemKey: (item) => item.id,
    renderItem: (item) => (
      <div className="bg-default border-subtle hover:border-emphasis overflow-hidden rounded-lg border transition-colors">
        <img src={item.image} alt={item.name} className="h-32 w-full object-cover" />
        <div className="p-4">
          <h3 className="text-emphasis text-center font-semibold">{item.name}</h3>
        </div>
      </div>
    ),
    options: {
      perView: 3,
      gap: 16,
    },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8 w-[800px]">
      <div>
        <h3 className="text-sm font-semibold mb-4">Default (3 items per view)</h3>
        <Slider
          title="Popular Apps"
          items={sampleApps}
          itemKey={(item) => item.id}
          renderItem={(item) => <SampleCard title={item.name} description={item.description} />}
          options={{ perView: 3, gap: 16 }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-4">Single item per view</h3>
        <Slider
          title="Featured Integration"
          items={sampleApps.slice(0, 3)}
          itemKey={(item) => item.id}
          renderItem={(item) => <SampleCard title={item.name} description={item.description} />}
          options={{ perView: 1, gap: 20 }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-4">Without title</h3>
        <Slider
          items={sampleApps.slice(0, 4)}
          itemKey={(item) => item.id}
          renderItem={(item) => <SampleCard title={item.name} description={item.description} />}
          options={{ perView: 2, gap: 16 }}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
  decorators: [],
};

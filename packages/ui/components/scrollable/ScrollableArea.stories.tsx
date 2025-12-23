import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ScrollableArea } from "./ScrollableArea";

const meta = {
  component: ScrollableArea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScrollableArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "max-h-[200px] w-[300px]",
    children: (
      <div className="space-y-2 p-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="border-subtle rounded border p-2">
            <p className="text-sm">Item {i + 1}</p>
          </div>
        ))}
      </div>
    ),
  },
};

export const ShortContent: Story = {
  args: {
    className: "max-h-[300px] w-[300px]",
    children: (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="border-subtle rounded border p-2">
            <p className="text-sm">Item {i + 1}</p>
          </div>
        ))}
      </div>
    ),
  },
};

export const TeamMemberList: Story = {
  args: {
    className: "max-h-[250px] w-[350px]",
    children: (
      <div className="divide-subtle divide-y">
        {[
          "Alice Johnson",
          "Bob Smith",
          "Carol Williams",
          "David Brown",
          "Eve Davis",
          "Frank Miller",
          "Grace Wilson",
          "Henry Moore",
          "Iris Taylor",
          "Jack Anderson",
        ].map((name, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="bg-subtle flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
              {name.charAt(0)}
            </div>
            <div>
              <p className="text-emphasis text-sm font-medium">{name}</p>
              <p className="text-subtle text-xs">{name.toLowerCase().replace(" ", ".")}@example.com</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
};

export const EventList: Story = {
  args: {
    className: "max-h-[200px] w-[400px]",
    children: (
      <div className="divide-subtle divide-y">
        {[
          { title: "Team Standup", time: "9:00 AM", duration: "15 min" },
          { title: "1:1 with Manager", time: "10:00 AM", duration: "30 min" },
          { title: "Product Review", time: "11:00 AM", duration: "60 min" },
          { title: "Lunch Break", time: "12:00 PM", duration: "60 min" },
          { title: "Client Call", time: "2:00 PM", duration: "45 min" },
          { title: "Sprint Planning", time: "3:00 PM", duration: "90 min" },
          { title: "Code Review", time: "5:00 PM", duration: "30 min" },
        ].map((event, i) => (
          <div key={i} className="flex items-center justify-between p-3">
            <div>
              <p className="text-emphasis text-sm font-medium">{event.title}</p>
              <p className="text-subtle text-xs">{event.time}</p>
            </div>
            <span className="text-subtle text-xs">{event.duration}</span>
          </div>
        ))}
      </div>
    ),
  },
};

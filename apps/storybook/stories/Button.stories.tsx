import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ComponentMeta, ComponentStory } from "@storybook/react";
import { Trash2 } from "react-feather";

import Button from "@calcom/ui/v2/core/Button";

export default {
  title: "Button",
  component: Button,
  argTypes: {
    color: {
      options: ["primary", "secondary", "minimal", "destructive"],
      control: { type: "select" },
    },
    disabled: {
      options: [true, false],
      control: { type: "boolean" },
    },
    loading: {
      options: [true, false],
      control: { type: "boolean" },
    },
    size: {
      options: ["base", "lg", "icon"],
      control: { type: "radio" },
    },
  },
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = (args) => <Button {...args} />;

export const All = () => (
  <div>
    <TooltipProvider>
      <h1>Primary</h1>
      <div className="flex space-x-2">
        <Button aria-label="Button Text">Button Text</Button>
        <Button disabled aria-label="Button Text">
          Button Text
        </Button>
      </div>
      <h1>Secondary</h1>
      <div className="flex space-x-2">
        <Button color="secondary" aria-label="Button Text">
          Button Text
        </Button>
        <Button disabled color="secondary" aria-label="Button Text">
          Button Text
        </Button>
        <Button size="icon" color="secondary" StartIcon={Trash2} aria-label="Button Text" />
      </div>
      <h1>Minimal</h1>
      <div className="flex">
        <Button color="minimal" aria-label="Button Text">
          Button Text
        </Button>
        <Button disabled color="minimal" aria-label="Button Text">
          Button Text
        </Button>
        <Button size="icon" color="minimal" StartIcon={Trash2} aria-label="Button Text" />
      </div>
      <h1>Destructive</h1>
      <Button size="icon" color="destructive" StartIcon={Trash2} aria-label="Button Text" />
      <h1>Tooltip</h1>
      <Button
        tooltip="Deletes EventTypes"
        size="icon"
        color="destructive"
        StartIcon={Trash2}
        aria-label="Button Text"
      />
    </TooltipProvider>
  </div>
);

export const Default = Template.bind({});
Default.args = {
  color: "primary",
  children: "Button Text",
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Default.args,
  disabled: true,
};

export const Loading = Template.bind({});
Loading.args = {
  ...Default.args,
  loading: true,
};
export const Icon = Template.bind({});
Icon.args = {
  color: "secondary",
  StartIcon: Trash2,
  size: "icon",
};

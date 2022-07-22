import { ComponentMeta, ComponentStory } from "@storybook/react";
import { Trash2 } from "react-feather";

import { Button as ButtonComponent } from "@calcom/ui/v2";

export default {
  title: "Button",
  component: ButtonComponent,
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
} as ComponentMeta<typeof ButtonComponent>;

const Template: ComponentStory<typeof ButtonComponent> = (args) => <ButtonComponent {...args} />;

export const All = () => (
  <div>
    <h1>Primary</h1>
    <div className="flex space-x-2">
      <ButtonComponent aria-label="Button Text">Button Text</ButtonComponent>
      <ButtonComponent disabled aria-label="Button Text">
        Button Text
      </ButtonComponent>
    </div>
    <h1>Secondary</h1>
    <div className="flex space-x-2">
      <ButtonComponent color="secondary" aria-label="Button Text">
        Button Text
      </ButtonComponent>
      <ButtonComponent disabled color="secondary" aria-label="Button Text">
        Button Text
      </ButtonComponent>
      <ButtonComponent size="icon" color="secondary" StartIcon={Trash2} aria-label="Button Text" />
    </div>
    <h1>Minimal</h1>
    <div className="flex">
      <ButtonComponent color="minimal" aria-label="Button Text">
        Button Text
      </ButtonComponent>
      <ButtonComponent disabled color="minimal" aria-label="Button Text">
        Button Text
      </ButtonComponent>
      <ButtonComponent size="icon" color="minimal" StartIcon={Trash2} aria-label="Button Text" />
    </div>
    <h1>Destructive</h1>
    <ButtonComponent size="icon" color="destructive" StartIcon={Trash2} aria-label="Button Text" />
    <h1>Tooltip</h1>
    <ButtonComponent
      tooltip="Deletes EventTypes"
      size="icon"
      color="destructive"
      StartIcon={Trash2}
      aria-label="Button Text"
    />
  </div>
);

export const Button = Template.bind({});
Button.args = {
  color: "primary",
  children: "Button Text",
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Button.args,
  disabled: true,
};

export const Loading = Template.bind({});
Loading.args = {
  ...Button.args,
  loading: true,
};
export const Icon = Template.bind({});
Icon.args = {
  color: "secondary",
  StartIcon: Trash2,
  size: "icon",
};

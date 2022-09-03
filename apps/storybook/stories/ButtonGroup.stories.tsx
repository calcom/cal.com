import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ComponentMeta } from "@storybook/react";
import { ArrowLeft, ArrowRight, Clipboard, Navigation2, Trash2 } from "react-feather";

import Button from "@calcom/ui/v2/core/Button";
import ButtonGroup from "@calcom/ui/v2/core/ButtonGroup";

export default {
  title: "Button Group",
  component: ButtonGroup,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} as ComponentMeta<typeof ButtonGroup>;

export const Default = () => (
  <ButtonGroup>
    <Button StartIcon={Trash2} size="icon" color="secondary" />
    <Button StartIcon={Navigation2} size="icon" color="secondary" />
    <Button StartIcon={Clipboard} size="icon" color="secondary" />
  </ButtonGroup>
);

export const Combined = () => (
  <div className="flex flex-col space-y-2">
    <ButtonGroup combined>
      <Button StartIcon={Trash2} size="icon" color="secondary" combined />
      <Button StartIcon={Navigation2} size="icon" color="secondary" combined />
      <Button StartIcon={Clipboard} size="icon" color="secondary" combined />
    </ButtonGroup>
    <ButtonGroup combined>
      <Button StartIcon={ArrowLeft} size="icon" color="secondary" combined />
      <Button StartIcon={ArrowRight} size="icon" color="secondary" combined />
    </ButtonGroup>
  </div>
);

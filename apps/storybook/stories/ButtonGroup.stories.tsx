import { ComponentMeta } from "@storybook/react";
import { Clipboard, Navigation2, Trash2 } from "react-feather";

import { Button, ButtonGroup } from "@calcom/ui";

export default {
  title: "Button Group",
  component: ButtonGroup,
} as ComponentMeta<typeof ButtonGroup>;

export const Default = () => (
  <ButtonGroup>
    <Button StartIcon={Trash2} size="icon" color="secondary"></Button>
    <Button StartIcon={Navigation2} size="icon" color="secondary"></Button>
    <Button StartIcon={Clipboard} size="icon" color="secondary"></Button>
  </ButtonGroup>
);

export const Combined = () => (
  <ButtonGroup combined>
    <Button StartIcon={Trash2} size="icon" color="secondary" combined></Button>
    <Button StartIcon={Navigation2} size="icon" color="secondary" combined></Button>
    <Button StartIcon={Clipboard} size="icon" color="secondary" combined></Button>
  </ButtonGroup>
);

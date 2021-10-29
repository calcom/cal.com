// Button.stories.ts | Button.stories.tsx
import { Meta } from "@storybook/react";
import React from "react";

import { Button } from "@components/ui/Button";

export default {
  component: Button,
  title: "Components/Button",
} as Meta;

export const Primary: React.VFC<{}> = (args) => <Button {...args}>test</Button>;

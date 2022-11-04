import { ComponentStory, ComponentMeta } from "@storybook/react";
import { Info } from "react-feather";

import Banner from "@calcom/ui/v2/core/banner";

export default {
  title: "Banner",
  component: Banner,
} as ComponentMeta<typeof Banner>;

export const Default = () => {
  return (
    <Banner
      variant="neutral"
      title="Summarise what happened"
      description="Describe what can be done about it here."
      Icon={Info}
      onDismiss={() => console.log("dismissed")}
    />
  );
};

export const Warning = () => {
  return (
    <Banner
      variant="warning"
      title="Summarise what happened"
      description="Describe what can be done about it here."
      Icon={Info}
      onDismiss={() => console.log("dismissed")}
    />
  );
};

export const Error = () => {
  return (
    <Banner
      variant="error"
      title="Summarise what happened"
      description="Describe what can be done about it here."
      errorMessage="Event creation failed"
      Icon={Info}
      onDismiss={() => console.log("dismissed")}
    />
  );
};

import { ComponentMeta } from "@storybook/react";
import { Bell } from "react-feather";

import EmptyScreen from "@calcom/ui/v2/core/EmptyScreen";

export default {
  title: "pattern/Empty Screen",
  component: EmptyScreen,
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof EmptyScreen>;

export const Default = () => (
  <EmptyScreen
    Icon={Bell}
    headline="Empty State Header"
    description="Ullamco dolor nulla sint nulla occaecat aliquip id elit fugiat et excepteur magna. Nisi tempor anim do tempor irure fugiat ad occaecat. Mollit ea eiusmod pariatur sunt deserunt eu eiusmod. Sit reprehenderit "
    buttonText="Veniam ut ipsum"
    buttonOnClick={() => console.log("Button Clicked")}
  />
);

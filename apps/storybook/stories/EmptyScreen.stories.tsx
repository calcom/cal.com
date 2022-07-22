import { ComponentMeta } from "@storybook/react";
import { Bell } from "react-feather";

import { EmptyScreen as EmptyScreenPattern } from "@calcom/ui/v2";

export default {
  title: "pattern/Empty Screen",
  component: EmptyScreenPattern,
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof EmptyScreenPattern>;

export const EmptyScreenS = () => (
  <EmptyScreenPattern
    Icon={Bell}
    headline="Empty State Header"
    description="Ullamco dolor nulla sint nulla occaecat aliquip id elit fugiat et excepteur magna. Nisi tempor anim do tempor irure fugiat ad occaecat. Mollit ea eiusmod pariatur sunt deserunt eu eiusmod. Sit reprehenderit cupidatat consequat commodo in aliqua ea et. Et quis sit enim proident dolor mollit consectetur tempor dolore reprehenderit consequat adipisicing reprehenderit officia. Sint eu sunt fugiat laborum Lorem irure aute nulla et. Do non in enim ipsum ea."
    buttonText="Veniam ut ipsum"
    buttonOnClick={() => console.log("Button Clicked")}
  />
);
